import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OperatingSchedule {
  id: string;
  location_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useLocationOperatingSchedules = (locationId?: string) => {
  return useQuery({
    queryKey: ["location_operating_schedules", locationId],
    queryFn: async () => {
      if (!locationId) return [];
      
      const { data, error } = await supabase
        .from("location_operating_schedules")
        .select("*")
        .eq("location_id", locationId)
        .order("day_of_week");

      if (error) throw error;
      return data as OperatingSchedule[];
    },
    enabled: !!locationId,
  });
};

export const useSaveLocationOperatingSchedules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      schedules,
    }: {
      locationId: string;
      schedules: Array<{
        day_of_week: number;
        open_time: string;
        close_time: string;
        is_closed: boolean;
      }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete existing schedules for this location
      await supabase
        .from("location_operating_schedules")
        .delete()
        .eq("location_id", locationId);

      // Insert new schedules
      const { data, error } = await supabase
        .from("location_operating_schedules")
        .insert(
          schedules.map((schedule) => ({
            location_id: locationId,
            created_by: user.id,
            ...schedule,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["location_operating_schedules", variables.locationId],
      });
      toast.success("Operating hours updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update operating hours: " + error.message);
    },
  });
};
