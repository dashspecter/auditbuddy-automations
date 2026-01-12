import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WarningMetadata {
  severity?: 'minor' | 'major' | 'critical';
  category?: 'attendance' | 'punctuality' | 'tasks' | 'hygiene_safety' | 'customer' | 'cash_inventory' | 'policy' | 'other';
  title?: string;
  notes?: string;
  evidence_url?: string | null;
  related_audit_id?: string | null;
}

export interface StaffEvent {
  id: string;
  staff_id: string;
  company_id: string;
  location_id: string | null;
  event_type: string;
  event_date: string;
  amount: number | null;
  description: string;
  metadata: WarningMetadata | null;
  created_at: string;
  created_by: string;
}

export type CreateStaffEventInput = Omit<StaffEvent, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export const useStaffEvents = (staffId?: string) => {
  return useQuery({
    queryKey: ["staff-events", staffId],
    queryFn: async () => {
      let query = supabase
        .from("staff_events")
        .select("*")
        .order("event_date", { ascending: false });
      
      if (staffId) {
        query = query.eq("staff_id", staffId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StaffEvent[];
    },
    enabled: !!staffId,
  });
};

export const useCompanyStaffEvents = (companyId?: string, eventType?: string) => {
  return useQuery({
    queryKey: ["staff-events", "company", companyId, eventType],
    queryFn: async () => {
      let query = supabase
        .from("staff_events")
        .select(`
          *,
          employees:staff_id(id, full_name, role, avatar_url, location_id, locations(id, name))
        `)
        .eq("company_id", companyId!)
        .order("event_date", { ascending: false });
      
      if (eventType) {
        query = query.eq("event_type", eventType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

export const useWarnings = (companyId?: string, filters?: {
  locationId?: string;
  employeeId?: string;
  severity?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  eventType?: 'warning' | 'coaching_note';
}) => {
  return useQuery({
    queryKey: ["warnings", companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("staff_events")
        .select(`
          *,
          employee:staff_id(id, full_name, role, avatar_url, location_id, locations(id, name)),
          creator:created_by(id, full_name)
        `)
        .eq("company_id", companyId!)
        .in("event_type", ["warning", "coaching_note"])
        .order("event_date", { ascending: false });
      
      if (filters?.locationId) {
        query = query.eq("location_id", filters.locationId);
      }
      if (filters?.employeeId) {
        query = query.eq("staff_id", filters.employeeId);
      }
      if (filters?.dateFrom) {
        query = query.gte("event_date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("event_date", filters.dateTo);
      }
      if (filters?.eventType) {
        query = query.eq("event_type", filters.eventType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by severity/category from metadata client-side
      let result = data || [];
      if (filters?.severity) {
        result = result.filter((e: any) => e.metadata?.severity === filters.severity);
      }
      if (filters?.category) {
        result = result.filter((e: any) => e.metadata?.category === filters.category);
      }
      
      return result;
    },
    enabled: !!companyId,
  });
};

export const useCreateStaffEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: CreateStaffEventInput) => {
      // Cast metadata to any to satisfy Supabase types
      const insertData = {
        ...event,
        metadata: event.metadata as any,
      };
      const { data, error } = await supabase
        .from("staff_events")
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-events"] });
      queryClient.invalidateQueries({ queryKey: ["warnings"] });
      toast.success("Event recorded successfully");
    },
    onError: (error) => {
      toast.error("Failed to record event: " + error.message);
    },
  });
};

export const useUpdateStaffEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffEvent> & { id: string }) => {
      // Cast metadata to any to satisfy Supabase types
      const updateData = {
        ...updates,
        metadata: updates.metadata as any,
      };
      const { data, error } = await supabase
        .from("staff_events")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-events"] });
      queryClient.invalidateQueries({ queryKey: ["warnings"] });
      toast.success("Event updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update event: " + error.message);
    },
  });
};

export const useDeleteStaffEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_events")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-events"] });
      queryClient.invalidateQueries({ queryKey: ["warnings"] });
      toast.success("Event deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete event: " + error.message);
    },
  });
};
