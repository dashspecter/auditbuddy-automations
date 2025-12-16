import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface ClockInReminder {
  id: string;
  company_id: string;
  message: string;
  is_active: boolean;
  display_order: number;
  target_roles: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const useClockInReminders = () => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["clock-in-reminders", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("clock_in_reminders")
        .select("*")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ClockInReminder[];
    },
    enabled: !!company?.id,
  });
};

export const useAllClockInReminders = () => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["all-clock-in-reminders", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("clock_in_reminders")
        .select("*")
        .eq("company_id", company.id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ClockInReminder[];
    },
    enabled: !!company?.id,
  });
};

// For staff app - fetch reminders by employee's company and role
export const useStaffClockInReminders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["staff-clock-in-reminders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get employee's company_id and role
      const { data: employee } = await supabase
        .from("employees")
        .select("company_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!employee?.company_id) return [];

      const { data, error } = await supabase
        .from("clock_in_reminders")
        .select("*")
        .eq("company_id", employee.company_id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      // Filter reminders by role - show if no target_roles or employee's role is in target_roles
      const reminders = (data as ClockInReminder[]).filter((reminder) => {
        if (!reminder.target_roles || reminder.target_roles.length === 0) {
          return true; // Show to all if no specific roles set
        }
        return reminder.target_roles.includes(employee.role);
      });
      
      return reminders;
    },
    enabled: !!user?.id,
  });
};

export const useCreateClockInReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async ({ message, target_roles }: { message: string; target_roles: string[] }) => {
      if (!company?.id || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("clock_in_reminders")
        .insert({
          company_id: company.id,
          message,
          target_roles,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clock-in-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["all-clock-in-reminders"] });
      toast.success("Reminder added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add reminder: ${error.message}`);
    },
  });
};

export const useUpdateClockInReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ClockInReminder> & { id: string }) => {
      const { data: reminder, error } = await supabase
        .from("clock_in_reminders")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clock-in-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["all-clock-in-reminders"] });
      toast.success("Reminder updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update reminder: ${error.message}`);
    },
  });
};

export const useDeleteClockInReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clock_in_reminders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clock-in-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["all-clock-in-reminders"] });
      toast.success("Reminder deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete reminder: ${error.message}`);
    },
  });
};
