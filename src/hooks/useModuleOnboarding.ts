import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ModuleOnboarding {
  id: string;
  user_id: string;
  module_name: string;
  completed: boolean;
  completed_at: string | null;
  steps_completed: string[];
  created_at: string;
  updated_at: string;
}

export const useModuleOnboarding = (moduleName: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['module_onboarding', user?.id, moduleName],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_module_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_name', moduleName)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ModuleOnboarding | null;
    },
    enabled: !!user,
  });
};

export const useCompleteOnboardingStep = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      moduleName, 
      stepId 
    }: { 
      moduleName: string; 
      stepId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if onboarding record exists
      const { data: existing } = await supabase
        .from('user_module_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_name', moduleName)
        .maybeSingle();

      const currentSteps = (existing?.steps_completed as string[]) || [];
      const updatedSteps = Array.from(new Set([...currentSteps, stepId]));

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('user_module_onboarding')
          .update({ 
            steps_completed: updatedSteps,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('user_module_onboarding')
          .insert({
            user_id: user.id,
            module_name: moduleName,
            steps_completed: updatedSteps,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['module_onboarding', user?.id, variables.moduleName] 
      });
    },
  });
};

export const useCompleteModuleOnboarding = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (moduleName: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if onboarding record exists
      const { data: existing } = await supabase
        .from('user_module_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_name', moduleName)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('user_module_onboarding')
          .update({ 
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create completed record
        const { data, error } = await supabase
          .from('user_module_onboarding')
          .insert({
            user_id: user.id,
            module_name: moduleName,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, moduleName) => {
      queryClient.invalidateQueries({ 
        queryKey: ['module_onboarding', user?.id, moduleName] 
      });
    },
  });
};

export const useResetModuleOnboarding = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (moduleName: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_module_onboarding')
        .delete()
        .eq('user_id', user.id)
        .eq('module_name', moduleName);

      if (error) throw error;
    },
    onSuccess: (_, moduleName) => {
      queryClient.invalidateQueries({ 
        queryKey: ['module_onboarding', user?.id, moduleName] 
      });
    },
  });
};
