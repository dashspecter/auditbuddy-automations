import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MyWarning {
  id: string;
  event_type: 'warning' | 'coaching_note';
  event_date: string;
  description: string;
  metadata: {
    severity?: 'minor' | 'major' | 'critical';
    category?: string;
    title?: string;
    notes?: string;
    evidence_url?: string | null;
    related_audit_id?: string | null;
  } | null;
  created_at: string;
  location_name: string | null;
  creator_name: string | null;
  seen_at: string | null;
}

/**
 * Hook to fetch the current employee's own warnings and coaching notes
 */
export const useMyWarnings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-warnings", user?.id],
    queryFn: async (): Promise<MyWarning[]> => {
      if (!user?.id) return [];

      // First get the employee ID for this user
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (empError) throw empError;
      if (!employee) return [];

      // Fetch warnings/coaching notes for this employee
      const { data: warnings, error: warningsError } = await supabase
        .from("staff_events")
        .select(`
          id,
          event_type,
          event_date,
          description,
          metadata,
          created_at,
          location_id
        `)
        .eq("staff_id", employee.id)
        .in("event_type", ["warning", "coaching_note"])
        .order("event_date", { ascending: false });

      if (warningsError) throw warningsError;
      if (!warnings || warnings.length === 0) return [];

      // Get location names
      const locationIds = [...new Set(warnings.filter(w => w.location_id).map(w => w.location_id))];
      let locationMap: Record<string, string> = {};
      
      if (locationIds.length > 0) {
        const { data: locations } = await supabase
          .from("locations")
          .select("id, name")
          .in("id", locationIds);
        
        if (locations) {
          locationMap = Object.fromEntries(locations.map(l => [l.id, l.name]));
        }
      }

      // Get seen status for all warnings
      const warningIds = warnings.map(w => w.id);
      const { data: viewedRecords } = await supabase
        .from("employee_warning_views")
        .select("warning_id, seen_at")
        .eq("employee_id", employee.id)
        .in("warning_id", warningIds);

      const viewedMap: Record<string, string> = {};
      if (viewedRecords) {
        viewedRecords.forEach(v => {
          viewedMap[v.warning_id] = v.seen_at;
        });
      }

      // Map to our interface
      return warnings.map((w): MyWarning => ({
        id: w.id,
        event_type: w.event_type as 'warning' | 'coaching_note',
        event_date: w.event_date,
        description: w.description,
        metadata: w.metadata as MyWarning['metadata'],
        created_at: w.created_at,
        location_name: w.location_id ? locationMap[w.location_id] || null : null,
        creator_name: null, // We don't expose creator to employee
        seen_at: viewedMap[w.id] || null,
      }));
    },
    enabled: !!user?.id,
  });
};

/**
 * Hook to get the current employee ID for the logged-in user
 */
export const useMyEmployeeId = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-employee-id", user?.id],
    queryFn: async (): Promise<string | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.id || null;
    },
    enabled: !!user?.id,
  });
};

/**
 * Mutation to mark a warning as seen
 */
export const useMarkWarningSeen = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (warningId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get employee ID
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (empError) throw empError;
      if (!employee) throw new Error("Employee not found");

      // Upsert the view record (idempotent)
      const { error } = await supabase
        .from("employee_warning_views")
        .upsert(
          {
            warning_id: warningId,
            employee_id: employee.id,
          },
          {
            onConflict: "warning_id,employee_id",
            ignoreDuplicates: true,
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-warnings"] });
    },
    onError: (error) => {
      console.error("Failed to mark warning as seen:", error);
      // Silent failure - don't show toast for seen tracking
    },
  });
};

/**
 * Get warning statistics for the current employee
 */
export const useMyWarningsStats = () => {
  const { data: warnings, isLoading } = useMyWarnings();

  const stats = {
    total: warnings?.length || 0,
    warnings: warnings?.filter(w => w.event_type === 'warning').length || 0,
    coachingNotes: warnings?.filter(w => w.event_type === 'coaching_note').length || 0,
    unseen: warnings?.filter(w => !w.seen_at).length || 0,
    critical: warnings?.filter(w => w.event_type === 'warning' && w.metadata?.severity === 'critical').length || 0,
    major: warnings?.filter(w => w.event_type === 'warning' && w.metadata?.severity === 'major').length || 0,
    minor: warnings?.filter(w => w.event_type === 'warning' && w.metadata?.severity === 'minor').length || 0,
  };

  return { stats, isLoading };
};
