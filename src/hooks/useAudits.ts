import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LocationAudit {
  id: string;
  user_id: string;
  location: string;
  audit_date: string;
  time_start?: string;
  time_end?: string;
  compliance_licenses?: number;
  compliance_permits?: number;
  compliance_signage?: number;
  compliance_documentation?: number;
  boh_storage?: number;
  boh_temperature?: number;
  boh_preparation?: number;
  boh_equipment?: number;
  cleaning_surfaces?: number;
  cleaning_floors?: number;
  cleaning_equipment?: number;
  cleaning_waste?: number;
  foh_customer_areas?: number;
  foh_restrooms?: number;
  foh_menu_boards?: number;
  foh_seating?: number;
  template_id?: string;
  custom_data?: any;
  overall_score?: number;
  status: 'compliant' | 'non-compliant' | 'pending';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useLocationAudits = () => {
  return useQuery({
    queryKey: ['location_audits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LocationAudit[];
    },
  });
};

export const useLocationAudit = (id: string) => {
  return useQuery({
    queryKey: ['location_audit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_audits')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as LocationAudit | null;
    },
    enabled: !!id,
  });
};

export const useCreateLocationAudit = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (audit: Omit<LocationAudit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'profiles'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('location_audits')
        .insert([{ ...audit, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location_audits'] });
    },
  });
};
