import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface CmmsProcedureStep {
  id: string;
  procedure_id: string;
  step_order: number;
  title: string;
  instruction_text: string | null;
  requires_photo: boolean;
  requires_value: boolean;
  value_type: string | null;
  choices_json: any;
  created_at: string;
  updated_at: string;
}

export interface CmmsProcedure {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  safety_notes: string | null;
  version: number;
  is_published: boolean;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  steps?: CmmsProcedureStep[];
}

export function useCmmsProcedures() {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-procedures', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('cmms_procedures')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('title');

      if (error) throw error;
      return data as CmmsProcedure[];
    },
    enabled: !!companyId,
  });
}

export function useCmmsProcedureById(id: string | undefined) {
  return useQuery({
    queryKey: ['cmms-procedure', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('cmms_procedures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CmmsProcedure;
    },
    enabled: !!id,
  });
}

export function useCmmsProcedureSteps(procedureId: string | undefined) {
  return useQuery({
    queryKey: ['cmms-procedure-steps', procedureId],
    queryFn: async () => {
      if (!procedureId) return [];
      
      const { data, error } = await supabase
        .from('cmms_procedure_steps')
        .select('*')
        .eq('procedure_id', procedureId)
        .order('step_order');

      if (error) throw error;
      return data as CmmsProcedureStep[];
    },
    enabled: !!procedureId,
  });
}

export function useCreateCmmsProcedure() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async (procedure: {
      title: string;
      description?: string;
      estimated_minutes?: number;
      safety_notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      if (!companyData?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('cmms_procedures')
        .insert({
          ...procedure,
          company_id: companyData.id,
          created_by: userData.user.id,
          version: 1,
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Log to audit
      await supabase.from('cmms_audit_log').insert({
        company_id: companyData.id,
        actor_user_id: userData.user.id,
        action: 'created',
        entity_type: 'procedure',
        entity_id: data.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-procedures'] });
      toast.success('Procedure created');
    },
    onError: (error) => {
      toast.error('Failed to create procedure: ' + error.message);
    },
  });
}

export function useUpdateCmmsProcedure() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CmmsProcedure> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('cmms_procedures')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (companyData?.id) {
        await supabase.from('cmms_audit_log').insert({
          company_id: companyData.id,
          actor_user_id: userData.user.id,
          action: 'updated',
          entity_type: 'procedure',
          entity_id: id,
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-procedures'] });
      queryClient.invalidateQueries({ queryKey: ['cmms-procedure', data.id] });
      toast.success('Procedure updated');
    },
    onError: (error) => {
      toast.error('Failed to update procedure: ' + error.message);
    },
  });
}

export function usePublishCmmsProcedure() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get current procedure
      const { data: current } = await supabase
        .from('cmms_procedures')
        .select('version')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('cmms_procedures')
        .update({
          is_published: true,
          version: (current?.version || 0) + 1,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (companyData?.id) {
        await supabase.from('cmms_audit_log').insert({
          company_id: companyData.id,
          actor_user_id: userData.user.id,
          action: 'published',
          entity_type: 'procedure',
          entity_id: id,
          metadata_json: { version: data.version },
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-procedures'] });
      queryClient.invalidateQueries({ queryKey: ['cmms-procedure', data.id] });
      toast.success(`Procedure published (v${data.version})`);
    },
    onError: (error) => {
      toast.error('Failed to publish procedure: ' + error.message);
    },
  });
}

// Procedure Steps CRUD
export function useCreateCmmsProcedureStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (step: {
      procedure_id: string;
      step_order: number;
      title: string;
      instruction_text?: string;
      requires_photo?: boolean;
      requires_value?: boolean;
      value_type?: string;
      choices_json?: any;
    }) => {
      const { data, error } = await supabase
        .from('cmms_procedure_steps')
        .insert(step)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-procedure-steps', data.procedure_id] });
    },
    onError: (error) => {
      toast.error('Failed to add step: ' + error.message);
    },
  });
}

export function useUpdateCmmsProcedureStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CmmsProcedureStep> & { id: string }) => {
      const { data, error } = await supabase
        .from('cmms_procedure_steps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-procedure-steps', data.procedure_id] });
    },
    onError: (error) => {
      toast.error('Failed to update step: ' + error.message);
    },
  });
}

export function useDeleteCmmsProcedureStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, procedureId }: { id: string; procedureId: string }) => {
      const { error } = await supabase
        .from('cmms_procedure_steps')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, procedureId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms-procedure-steps', data.procedureId] });
    },
    onError: (error) => {
      toast.error('Failed to delete step: ' + error.message);
    },
  });
}

// Generate checklist snapshot for work orders
export function generateChecklistSnapshot(steps: CmmsProcedureStep[]) {
  return steps.map((step, index) => ({
    step_key: `step_${index + 1}`,
    step_order: step.step_order,
    title: step.title,
    instruction_text: step.instruction_text,
    requires_photo: step.requires_photo,
    requires_value: step.requires_value,
    value_type: step.value_type,
    choices_json: step.choices_json,
  }));
}
