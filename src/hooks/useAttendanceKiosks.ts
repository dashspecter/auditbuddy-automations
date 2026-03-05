import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AttendanceKiosk {
  id: string;
  location_id: string;
  company_id: string;
  department_id: string | null;
  device_token: string;
  device_name: string;
  is_active: boolean;
  last_active_at: string | null;
  registered_by: string;
  registered_at: string;
  created_at: string;
  updated_at: string;
  locations?: { name: string };
  departments?: { name: string } | null;
}

export const useAttendanceKiosks = () => {
  return useQuery({
    queryKey: ["attendance-kiosks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: companyData } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!companyData) throw new Error("No company found");

      const { data, error } = await supabase
        .from("attendance_kiosks")
        .select(`*, locations:location_id(name), departments:department_id(name)`)
        .eq("company_id", companyData.company_id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as AttendanceKiosk[];
    },
  });
};

export const useCreateKiosk = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      locationId, 
      deviceName,
      departmentId 
    }: { 
      locationId: string; 
      deviceName: string;
      departmentId?: string;
    }) => {
      // Get company ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyData } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      
      if (!companyData) throw new Error("No company found");
      
      // Generate unique device token
      const deviceToken = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from("attendance_kiosks")
        .insert({
          location_id: locationId,
          company_id: companyData.company_id,
          device_token: deviceToken,
          device_name: deviceName,
          registered_by: user.id,
          ...(departmentId ? { department_id: departmentId } : {}),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-kiosks"] });
      toast.success("Kiosk registered successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to register kiosk");
    },
  });
};

export const useDeleteKiosk = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (kioskId: string) => {
      const { error } = await supabase
        .from("attendance_kiosks")
        .delete()
        .eq("id", kioskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-kiosks"] });
      toast.success("Kiosk removed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove kiosk");
    },
  });
};

export const useKioskByToken = (tokenOrSlug: string | undefined) => {
  return useQuery({
    queryKey: ["kiosk-by-token", tokenOrSlug],
    queryFn: async () => {
      if (!tokenOrSlug) return null;

      const normalizedToken = (() => {
        try {
          return decodeURIComponent(tokenOrSlug).trim();
        } catch {
          return tokenOrSlug.trim();
        }
      })();

      // Try candidates (handle apostrophe-as-dash typo)
      const slugCandidates = Array.from(
        new Set([
          normalizedToken,
          normalizedToken.replace(/-s-/g, "s-"),
        ])
      ).filter(Boolean);

      for (const candidate of slugCandidates) {
        const { data, error } = await supabase.rpc("get_kiosk_by_token_or_slug", {
          p_token: candidate,
        });

        if (error) throw error;

        if (data && data.length > 0) {
          const row = data[0];
          return {
            id: row.id,
            location_id: row.location_id,
            company_id: row.company_id,
            department_id: row.department_id,
            device_token: row.device_token,
            device_name: row.device_name,
            is_active: row.is_active,
            last_active_at: row.last_active_at,
            registered_by: row.registered_by,
            registered_at: row.registered_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            custom_slug: row.custom_slug,
            locations: { name: row.location_name, address: row.location_address },
            departments: row.department_name ? { id: row.department_id!, name: row.department_name } : null,
          } as AttendanceKiosk & {
            locations: { name: string; address: string | null };
            custom_slug: string | null;
            departments: { id: string; name: string } | null;
          };
        }
      }

      return null;
    },
    enabled: !!tokenOrSlug,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });
};

// Generate a time-based token for QR validation
export const generateQRToken = (locationId: string, timestamp: number): string => {
  // Create a token that includes location and timestamp
  // This token changes every 30 seconds
  const period = Math.floor(timestamp / 30000);
  return btoa(JSON.stringify({ locationId, period, ts: timestamp }));
};

// Validate a QR token (check if it's within valid time window)
export const validateQRToken = (token: string): { valid: boolean; locationId: string | null; timestamp: number | null } => {
  try {
    const decoded = JSON.parse(atob(token));
    const now = Date.now();
    const tokenAge = now - decoded.ts;
    
    // Token is valid for 45 seconds (30 + 15 buffer)
    if (tokenAge > 45000) {
      return { valid: false, locationId: null, timestamp: null };
    }
    
    return { 
      valid: true, 
      locationId: decoded.locationId, 
      timestamp: decoded.ts 
    };
  } catch {
    return { valid: false, locationId: null, timestamp: null };
  }
};
