import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface CmmsTeam {
  id: string;
  company_id: string;
  name: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  members?: { user_id: string; profile?: { full_name: string; email: string } }[];
}

export function useCmmsTeams() {
  const { data: companyData } = useCompany();
  const companyId = companyData?.id;

  return useQuery({
    queryKey: ['cmms-teams', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('cmms_teams')
        .select(`
          *,
          cmms_team_members(
            user_id,
            profiles(full_name, email)
          )
        `)
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      
      return data.map(t => ({
        ...t,
        members: t.cmms_team_members?.map((tm: any) => ({
          user_id: tm.user_id,
          profile: tm.profiles
        })) || []
      })) as CmmsTeam[];
    },
    enabled: !!companyId,
  });
}

export function useCreateCmmsTeam() {
  const queryClient = useQueryClient();
  const { data: companyData } = useCompany();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      member_user_ids?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !companyData?.id) throw new Error('Not authenticated');

      const { data: team, error } = await supabase
        .from('cmms_teams')
        .insert({
          company_id: companyData.id,
          name: data.name,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add team members
      if (data.member_user_ids?.length) {
        const { error: memError } = await supabase
          .from('cmms_team_members')
          .insert(data.member_user_ids.map(uid => ({
            team_id: team.id,
            user_id: uid,
          })));
        if (memError) throw memError;
      }

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-teams'] });
      toast.success('Team created');
    },
    onError: (error) => {
      toast.error('Failed to create team: ' + error.message);
    },
  });
}

export function useUpdateCmmsTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      name?: string;
      is_archived?: boolean;
    }) => {
      const { error } = await supabase
        .from('cmms_teams')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-teams'] });
      toast.success('Team updated');
    },
    onError: (error) => {
      toast.error('Failed to update team: ' + error.message);
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const { error } = await supabase
        .from('cmms_team_members')
        .insert({ team_id: teamId, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-teams'] });
      toast.success('Member added');
    },
    onError: (error) => {
      toast.error('Failed to add member: ' + error.message);
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const { error } = await supabase
        .from('cmms_team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms-teams'] });
      toast.success('Member removed');
    },
    onError: (error) => {
      toast.error('Failed to remove member: ' + error.message);
    },
  });
}
