import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RecurringSchedule {
  id: string;
  name: string;
  location_id: string;
  template_id: string;
  assigned_user_id: string;
  recurrence_pattern: 'daily' | 'weekly' | 'monthly' | 'every_4_weeks';
  day_of_week: number | null;
  day_of_month: number | null;
  start_time: string;
  duration_hours: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_generated_date: string | null;
  locations?: {
    name: string;
    city: string | null;
  };
  audit_templates?: {
    name: string;
  };
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

export const useRecurringSchedules = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recurring_schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_audit_schedules')
        .select(`
          *,
          locations(name, city),
          audit_templates(name),
          profiles:assigned_user_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
};

export const useCreateRecurringSchedule = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (scheduleData: {
      name: string;
      location_id: string;
      template_id: string;
      assigned_user_id: string;
      recurrence_pattern: 'daily' | 'weekly' | 'monthly' | 'every_4_weeks';
      day_of_week?: number;
      day_of_month?: number;
      start_time: string;
      duration_hours: number;
      start_date: string;
      end_date?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('recurring_audit_schedules')
        .insert({
          ...scheduleData,
          created_by: user!.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_schedules'] });
      toast.success('Recurring schedule created successfully');
    },
    onError: (error) => {
      console.error('Error creating recurring schedule:', error);
      toast.error('Failed to create recurring schedule');
    },
  });
};

export const useUpdateRecurringSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_audit_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_schedules'] });
      toast.success('Recurring schedule updated successfully');
    },
    onError: (error) => {
      console.error('Error updating recurring schedule:', error);
      toast.error('Failed to update recurring schedule');
    },
  });
};

export const useDeleteRecurringSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_audit_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_schedules'] });
      toast.success('Recurring schedule deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting recurring schedule:', error);
      toast.error('Failed to delete recurring schedule');
    },
  });
};
