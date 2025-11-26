import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LocationAudit {
  id: string;
  user_id: string;
  location: string; // Legacy text field - deprecated
  location_id?: string | null; // New FK to locations table
  audit_date: string;
  time_start?: string;
  time_end?: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  assigned_user_id?: string | null;
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
  status: 'compliant' | 'non-compliant' | 'pending' | 'draft';
  notes?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  audit_templates?: {
    name: string;
  };
  locations?: {
    id: string;
    name: string;
    city: string | null;
    type: string | null;
  };
}

export const useLocationAudits = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['location_audits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_audits')
        .select('*, locations(id, name, city, type)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LocationAudit[];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useLocationAudit = (id: string) => {
  return useQuery({
    queryKey: ['location_audit', id],
    queryFn: async () => {
      // Fetch the audit with location join
      const { data: audit, error: auditError } = await supabase
        .from('location_audits')
        .select('*, locations(id, name, city, type)')
        .eq('id', id)
        .maybeSingle();

      if (auditError) throw auditError;
      if (!audit) return null;

      // Fetch the profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', audit.user_id)
        .maybeSingle();

      // Fetch the template
      const { data: template } = audit.template_id ? await supabase
        .from('audit_templates')
        .select('name')
        .eq('id', audit.template_id)
        .maybeSingle() : { data: null };

      return {
        ...audit,
        profiles: profile,
        audit_templates: template
      } as LocationAudit;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
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
