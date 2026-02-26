import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export interface ScoutSubmission {
  id: string;
  job_id: string;
  scout_id: string;
  status: string;
  overall_notes: string | null;
  submitted_at: string;
  reviewer_user_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  // joined
  scout_jobs?: {
    title: string;
    company_id: string;
    location_id: string;
    locations?: { name: string } | null;
  } | null;
  scouts?: { full_name: string } | null;
}

export function useScoutSubmissions(statusFilter?: string) {
  const { data: company } = useCompany();
  const companyId = company?.id;
  
  return useQuery({
    queryKey: ['scout-submissions', companyId, statusFilter],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase
        .from('scout_submissions')
        .select('*, scout_jobs!inner(title, company_id, location_id, locations(name)), scouts(full_name)')
        .eq('scout_jobs.company_id', companyId)
        .order('submitted_at', { ascending: false });
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as ScoutSubmission[];
    },
    enabled: !!companyId,
  });
}

export function useScoutStepAnswers(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['scout-step-answers', submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const { data, error } = await supabase
        .from('scout_step_answers')
        .select('*, scout_job_steps(prompt, step_type, min_photos, min_videos, guidance_text)')
        .eq('submission_id', submissionId);
      if (error) throw error;
      return data;
    },
    enabled: !!submissionId,
  });
}

export function useScoutMedia(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['scout-media', submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const { data, error } = await supabase
        .from('scout_media')
        .select('*')
        .eq('submission_id', submissionId);
      if (error) throw error;
      return data;
    },
    enabled: !!submissionId,
  });
}

export function useReviewSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      submissionId: string;
      jobId: string;
      status: 'approved' | 'rejected' | 'resubmit_required';
      reviewerNotes?: string;
      stepResults?: { stepAnswerId: string; status: 'passed' | 'failed'; comment?: string }[];
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      // Update step answers if provided
      if (params.stepResults) {
        for (const sr of params.stepResults) {
          await supabase
            .from('scout_step_answers')
            .update({ step_status: sr.status, reviewer_comment: sr.comment || null })
            .eq('id', sr.stepAnswerId);
        }
      }
      
      // Update submission
      const { error: sErr } = await supabase
        .from('scout_submissions')
        .update({
          status: params.status,
          reviewer_user_id: user.user.id,
          reviewer_notes: params.reviewerNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', params.submissionId);
      if (sErr) throw sErr;
      
      // Update job status
      const jobStatus = params.status === 'approved' ? 'approved' : 'rejected';
      const jobUpdates: Record<string, unknown> = {
        status: jobStatus,
        reviewer_user_id: user.user.id,
        reviewed_at: new Date().toISOString(),
      };
      if (jobStatus === 'approved') jobUpdates.approved_at = new Date().toISOString();
      if (jobStatus === 'rejected') {
        jobUpdates.rejected_at = new Date().toISOString();
        if (params.status === 'resubmit_required') jobUpdates.status = 'rejected';
      }
      
      const { error: jErr } = await supabase.from('scout_jobs').update(jobUpdates).eq('id', params.jobId);
      if (jErr) throw jErr;
      
      // Create payout if approved
      if (params.status === 'approved') {
        const { data: job } = await supabase
          .from('scout_jobs')
          .select('assigned_scout_id, payout_amount, currency')
          .eq('id', params.jobId)
          .single();
        if (job?.assigned_scout_id) {
          await supabase.from('scout_payouts').insert({
            scout_id: job.assigned_scout_id,
            job_id: params.jobId,
            amount: job.payout_amount,
            currency: job.currency,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['scout-jobs'] });
      toast.success('Review submitted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
