import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StaffLocation {
  id: string;
  staff_id: string;
  location_id: string;
  is_primary: boolean;
  created_at: string;
  locations?: {
    name: string;
  };
}

export const useStaffLocations = (staffId?: string) => {
  return useQuery({
    queryKey: ["staff-locations", staffId],
    queryFn: async () => {
      let query = supabase
        .from("staff_locations")
        .select("*, locations(name)")
        .order("is_primary", { ascending: false });
      
      if (staffId) {
        query = query.eq("staff_id", staffId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StaffLocation[];
    },
    enabled: !!staffId,
  });
};

export const useAddStaffLocation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ staffId, locationId, isPrimary }: { staffId: string; locationId: string; isPrimary: boolean }) => {
      const { data, error } = await supabase
        .from("staff_locations")
        .insert({ staff_id: staffId, location_id: locationId, is_primary: isPrimary })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-locations"] });
      toast.success("Location added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add location: " + error.message);
    },
  });
};

export const useRemoveStaffLocation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_locations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-locations"] });
      toast.success("Location removed successfully");
    },
    onError: (error) => {
      toast.error("Failed to remove location: " + error.message);
    },
  });
};
