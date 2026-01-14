import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ScheduledAudit {
  id: string;
  location_id: string | null;
  location: string;
  template_id: string | null;
  assigned_user_id: string | null;
  user_id: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: string | null;
  audit_date: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
  audit_templates?: {
    name: string;
    template_type?: string;
  } | null;
  locations?: {
    name: string;
    city: string | null;
  } | null;
}

export const useScheduledAudits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scheduled_audits', user?.id],
    queryFn: async () => {
      // Fetch all scheduled audits - RLS will filter appropriately
      // But for checkers, they should see audits assigned to them
      const { data, error } = await supabase
        .from('location_audits')
        .select(`
          *,
          profiles:assigned_user_id(full_name, email),
          audit_templates(name, template_type),
          locations(name, city)
        `)
        .not('scheduled_start', 'is', null)
        .order('scheduled_start', { ascending: true });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
};

export const useScheduleAudit = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (auditData: {
      location_id: string;
      template_id: string;
      assigned_user_id: string;
      scheduled_start: string;
      scheduled_end: string;
      notes?: string;
    }) => {
      if (!user) {
        throw new Error('You must be logged in to schedule an audit');
      }

      // Get location name and company_id
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('name, company_id')
        .eq('id', auditData.location_id)
        .single();

      if (locationError) {
        console.error('Error fetching location:', locationError);
        throw new Error('Failed to fetch location details');
      }

      // Insert the audit with the current user as user_id (required by RLS)
      // and the assigned_user_id for who should perform it
      const { data, error } = await supabase
        .from('location_audits')
        .insert({
          location_id: auditData.location_id,
          template_id: auditData.template_id,
          assigned_user_id: auditData.assigned_user_id,
          scheduled_start: auditData.scheduled_start,
          scheduled_end: auditData.scheduled_end,
          notes: auditData.notes,
          user_id: user.id, // Must be current user to satisfy RLS policy
          company_id: locationData?.company_id, // Include company_id for consistency
          status: 'scheduled',
          location: locationData?.name || 'Unknown Location',
          audit_date: new Date(auditData.scheduled_start).toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting audit:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled_audits'] });
      queryClient.invalidateQueries({ queryKey: ['location_audits'] });
      toast.success('Audit scheduled successfully');
    },
    onError: (error: Error) => {
      console.error('Error scheduling audit:', error);
      toast.error(error.message || 'Failed to schedule audit');
    },
  });
};

export const useUpdateAuditStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ auditId, status }: { auditId: string; status: string }) => {
      const { data, error } = await supabase
        .from('location_audits')
        .update({ status })
        .eq('id', auditId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled_audits'] });
      queryClient.invalidateQueries({ queryKey: ['location_audits'] });
    },
  });
};
