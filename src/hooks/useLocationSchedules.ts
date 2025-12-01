import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LocationOperatingSchedule {
  id: string;
  location_id: string;
  day_of_week: number; // 0 = Monday, 6 = Sunday
  open_time: string;
  close_time: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const useLocationSchedules = (locationId?: string) => {
  return useQuery({
    queryKey: ["location-schedules", locationId],
    queryFn: async () => {
      let query = supabase
        .from("location_operating_schedules")
        .select("*")
        .order("day_of_week", { ascending: true });
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as LocationOperatingSchedule[];
    },
    enabled: !!locationId,
  });
};

export const useUpsertLocationSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (schedule: Omit<LocationOperatingSchedule, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("location_operating_schedules")
        .upsert({ 
          ...schedule,
          created_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'location_id,day_of_week'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-schedules"] });
      toast.success("Operating schedule updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update schedule: " + error.message);
    },
  });
};

export const useDeleteLocationSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("location_operating_schedules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-schedules"] });
      toast.success("Operating schedule deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete schedule: " + error.message);
    },
  });
};
