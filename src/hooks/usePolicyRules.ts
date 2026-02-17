import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type ConditionType = 'time_lock' | 'state_lock' | 'role_required' | 'approval_required' | 'custom';
export type EnforcementType = 'block' | 'warn' | 'log';

export interface PolicyRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  condition_type: ConditionType;
  condition_config: Record<string, any>;
  enforcement: EnforcementType;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PolicyRuleEvaluation {
  id: string;
  company_id: string;
  rule_id: string | null;
  user_id: string;
  resource: string;
  action: string;
  result: 'allowed' | 'blocked' | 'warned';
  context_json: Record<string, any> | null;
  evaluated_at: string;
}

export const usePolicyRules = () => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['policy_rules', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('policy_rules')
        .select('*')
        .eq('company_id', company.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PolicyRule[];
    },
    enabled: !!company?.id,
  });
};

export const usePolicyEvaluations = (limit = 50) => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['policy_rule_evaluations', company?.id, limit],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('policy_rule_evaluations')
        .select('*')
        .eq('company_id', company.id)
        .order('evaluated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PolicyRuleEvaluation[];
    },
    enabled: !!company?.id,
  });
};

export const useCreatePolicyRule = () => {
  const { user } = useAuth();
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: {
      name: string;
      description?: string;
      resource: string;
      action: string;
      condition_type: ConditionType;
      condition_config: Record<string, any>;
      enforcement: EnforcementType;
      priority?: number;
    }) => {
      if (!company?.id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('policy_rules')
        .insert({
          company_id: company.id,
          created_by: user.id,
          ...rule,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy_rules'] });
      toast({ title: 'Policy rule created' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create policy rule', description: error.message, variant: 'destructive' });
    },
  });
};

export const useTogglePolicyRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('policy_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy_rules'] });
      toast({ title: 'Policy rule updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update rule', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeletePolicyRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('policy_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy_rules'] });
      toast({ title: 'Policy rule deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete rule', description: error.message, variant: 'destructive' });
    },
  });
};
