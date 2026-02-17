import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface RoleTemplate {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RoleTemplatePermission {
  id: string;
  template_id: string;
  resource: string;
  action: string;
  granted: boolean;
  created_at: string;
}

export interface UserRoleTemplateAssignment {
  id: string;
  company_id: string;
  user_id: string;
  template_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

export const useRoleTemplates = () => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['role_templates', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('role_templates')
        .select('*')
        .or(`company_id.eq.${company.id},is_system.eq.true`)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as RoleTemplate[];
    },
    enabled: !!company?.id,
  });
};

export const useRoleTemplatePermissions = (templateId: string | null) => {
  return useQuery({
    queryKey: ['role_template_permissions', templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from('role_template_permissions')
        .select('*')
        .eq('template_id', templateId);

      if (error) throw error;
      return data as RoleTemplatePermission[];
    },
    enabled: !!templateId,
  });
};

export const useTemplateAssignments = () => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['user_role_template_assignments', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('user_role_template_assignments')
        .select('*')
        .eq('company_id', company.id);

      if (error) throw error;
      return data as UserRoleTemplateAssignment[];
    },
    enabled: !!company?.id,
  });
};

export const useCreateRoleTemplate = () => {
  const { user } = useAuth();
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      if (!company?.id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('role_templates')
        .insert({
          company_id: company.id,
          name,
          description,
          is_system: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role_templates'] });
      toast({ title: 'Role template created' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create template', description: error.message, variant: 'destructive' });
    },
  });
};

export const useToggleTemplatePermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      resource,
      action,
      granted,
    }: {
      templateId: string;
      resource: string;
      action: string;
      granted: boolean;
    }) => {
      if (granted) {
        const { error } = await supabase
          .from('role_template_permissions')
          .insert({ template_id: templateId, resource, action, granted: true });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_template_permissions')
          .delete()
          .eq('template_id', templateId)
          .eq('resource', resource)
          .eq('action', action);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['role_template_permissions', vars.templateId] });
    },
    onError: (error) => {
      toast({ title: 'Failed to update permission', description: error.message, variant: 'destructive' });
    },
  });
};

export const useAssignTemplate = () => {
  const { user } = useAuth();
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, templateId }: { userId: string; templateId: string }) => {
      if (!company?.id || !user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_role_template_assignments')
        .insert({
          company_id: company.id,
          user_id: userId,
          template_id: templateId,
          assigned_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_role_template_assignments'] });
      toast({ title: 'Role template assigned' });
    },
    onError: (error) => {
      toast({ title: 'Failed to assign template', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUnassignTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('user_role_template_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_role_template_assignments'] });
      toast({ title: 'Role template unassigned' });
    },
    onError: (error) => {
      toast({ title: 'Failed to unassign template', description: error.message, variant: 'destructive' });
    },
  });
};
