import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AttendanceKiosk {
  id: string;
  location_id: string;
  company_id: string;
  device_token: string;
  device_name: string;
  is_active: boolean;
  last_active_at: string | null;
  registered_by: string;
  registered_at: string;
  created_at: string;
  updated_at: string;
  locations?: { name: string };
}

export const useAttendanceKiosks = () => {
  return useQuery({
    queryKey: ["attendance-kiosks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_kiosks")
        .select(`*, locations:location_id(name)`)
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
      deviceName 
    }: { 
      locationId: string; 
      deviceName: string;
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

      // Some users may type an apostrophe as a dash (e.g. "bab-s") instead of removing it ("babs").
      // Try a small set of safe fallbacks.
      const slugCandidates = Array.from(
        new Set([
          normalizedToken,
          normalizedToken.replace(/-s-/g, "s-"),
        ])
      ).filter(Boolean);

      let data: any = null;
      let error: any = null;

      // First try to find by custom_slug (friendly URL) - exact match
      for (const candidate of slugCandidates) {
        const result = await supabase
          .from("attendance_kiosks")
          .select(`*, locations:location_id(name, address), custom_slug`)
          .eq("custom_slug", candidate)
          .eq("is_active", true)
          .maybeSingle();

        if (result.error) {
          error = result.error;
          break;
        }
        if (result.data) {
          data = result.data;
          break;
        }
      }

      // If not found by slug (case issues), try case-insensitive match
      if (!data && !error) {
        for (const candidate of slugCandidates) {
          const result = await supabase
            .from("attendance_kiosks")
            .select(`*, locations:location_id(name, address), custom_slug`)
            .ilike("custom_slug", candidate)
            .eq("is_active", true)
            .maybeSingle();

          if (result.error) {
            error = result.error;
            break;
          }
          if (result.data) {
            data = result.data;
            break;
          }
        }
      }

      // If not found by slug, try by device_token (UUID)
      if (!data && !error) {
        const result = await supabase
          .from("attendance_kiosks")
          .select(`*, locations:location_id(name, address), custom_slug`)
          .eq("device_token", normalizedToken)
          .eq("is_active", true)
          .maybeSingle();

        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      return data as (
        | (AttendanceKiosk & {
            locations: { name: string; address: string | null };
            custom_slug: string | null;
          })
        | null
      );
    },
    enabled: !!tokenOrSlug,
    // Keep refreshing to maintain connection
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 4 * 60 * 1000, // Data is fresh for 4 minutes
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
