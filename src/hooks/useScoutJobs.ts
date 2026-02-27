import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export interface ScoutJob {
  id: string;
  company_id: string;
  location_id: string;
  template_id: string;
  template_version: number;
  title: string;
  status: string;
  payout_amount: number;
  currency: string;
  payout_type: string;
  reward_description: string | null;
  voucher_expires_at: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  posted_at: string | null;
  accepted_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  paid_at: string | null;
  assigned_scout_id: string | null;
  created_by: string;
  notes_public: string | null;
  notes_internal: string | null;
  rejection_reasons: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // joined
  locations?: { name: string } | null;
  scout_templates?: { title: string } | null;
}

export function useScoutJobs(statusFilter?: string) {
  const { data: company } = useCompany();
  const companyId = company?.id;
  
  return useQuery({
    queryKey: ['scout-jobs', companyId, statusFilter],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase
        .from('scout_jobs')
        .select('*, locations(name), scout_templates(title)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as ScoutJob[];
    },
    enabled: !!companyId,
  });
}

export function useCreateScoutJob() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const companyId = company?.id;
  
  return useMutation({
    mutationFn: async (data: {
      template_id: string;
      location_id: string;
      title: string;
      payout_amount: number;
      currency?: string;
      payout_type?: string;
      reward_description?: string;
      voucher_expires_at?: string;
      time_window_start?: string;
      time_window_end?: string;
      notes_public?: string;
      notes_internal?: string;
      publish?: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      // Get template version
      const { data: tmpl } = await supabase
        .from('scout_templates')
        .select('version')
        .eq('id', data.template_id)
        .single();
      
      const status = data.publish ? 'posted' : 'draft';
      
      const { data: job, error: jErr } = await supabase
        .from('scout_jobs')
        .insert({
          company_id: companyId!,
          location_id: data.location_id,
          template_id: data.template_id,
          template_version: tmpl?.version || 1,
          title: data.title,
          status,
          payout_amount: data.payout_amount,
          currency: data.currency || 'RON',
          payout_type: data.payout_type || 'cash',
          reward_description: data.reward_description || null,
          voucher_expires_at: data.voucher_expires_at || null,
          time_window_start: data.time_window_start || null,
          time_window_end: data.time_window_end || null,
          posted_at: data.publish ? new Date().toISOString() : null,
          created_by: user.user.id,
          notes_public: data.notes_public || null,
          notes_internal: data.notes_internal || null,
        })
        .select()
        .single();
      if (jErr) throw jErr;
      
      // Copy template steps to job steps
      const { data: steps } = await supabase
        .from('scout_template_steps')
        .select('*')
        .eq('template_id', data.template_id)
        .order('step_order');
      
      if (steps && steps.length > 0) {
        const jobSteps = steps.map(s => ({
          job_id: job.id,
          step_order: s.step_order,
          prompt: s.prompt,
          step_type: s.step_type,
          is_required: s.is_required,
          min_photos: s.min_photos,
          min_videos: s.min_videos,
          guidance_text: s.guidance_text,
          validation_rules: s.validation_rules,
        }));
        const { error: sErr } = await supabase.from('scout_job_steps').insert(jobSteps);
        if (sErr) throw sErr;
      }
      
      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-jobs'] });
      toast.success('Job created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateScoutJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      const now = new Date().toISOString();
      if (status === 'posted') updates.posted_at = now;
      if (status === 'approved') updates.approved_at = now;
      if (status === 'rejected') updates.rejected_at = now;
      if (status === 'paid') updates.paid_at = now;
      if (status === 'cancelled') updates.updated_at = now;
      
      const { error } = await supabase.from('scout_jobs').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-jobs'] });
      toast.success('Job updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
