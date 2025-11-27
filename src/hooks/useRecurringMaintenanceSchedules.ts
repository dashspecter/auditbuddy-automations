import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecurringMaintenanceSchedule {
  id: string;
  equipment_id: string;
  location_id: string;
  title: string;
  description: string | null;
  recurrence_pattern: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  start_time: string;
  assigned_user_id: string;
  supervisor_user_id: string | null;
  is_active: boolean;
  last_generated_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  equipment?: {
    name: string;
  };
  locations?: {
    name: string;
  };
  assigned_user?: {
    full_name: string | null;
    email: string;
  };
  supervisor?: {
    full_name: string | null;
    email: string;
  };
}

export const useRecurringMaintenanceSchedules = (equipmentId?: string) => {
  return useQuery({
    queryKey: ["recurring-maintenance-schedules", equipmentId],
    queryFn: async () => {
      let query = supabase
        .from("recurring_maintenance_schedules")
        .select(`
          *,
          equipment (
            name
          ),
          locations (
            name
          ),
          assigned_user:profiles!recurring_maintenance_schedules_assigned_user_id_fkey (
            full_name,
            email
          ),
          supervisor:profiles!recurring_maintenance_schedules_supervisor_user_id_fkey (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (equipmentId) {
        query = query.eq("equipment_id", equipmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RecurringMaintenanceSchedule[];
    },
  });
};

export const useCreateRecurringMaintenanceSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: Omit<RecurringMaintenanceSchedule, "id" | "created_at" | "updated_at" | "created_by" | "last_generated_date">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("recurring_maintenance_schedules")
        .insert([{ ...schedule, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-maintenance-schedules"] });
      toast.success("Recurring schedule created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    },
  });
};

export const useUpdateRecurringMaintenanceSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...schedule }: Partial<RecurringMaintenanceSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from("recurring_maintenance_schedules")
        .update(schedule)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-maintenance-schedules"] });
      toast.success("Schedule updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });
};

export const useDeleteRecurringMaintenanceSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_maintenance_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-maintenance-schedules"] });
      toast.success("Schedule deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete schedule: ${error.message}`);
    },
  });
};
