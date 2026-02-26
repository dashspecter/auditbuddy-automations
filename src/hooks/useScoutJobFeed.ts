import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScoutAuth } from "./useScoutAuth";
import { toast } from "sonner";

export interface ScoutFeedJob {
  id: string;
  title: string;
  status: string;
  payout_amount: number;
  currency: string;
  time_window_start: string | null;
  time_window_end: string | null;
  posted_at: string | null;
  accepted_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  notes_public: string | null;
  assigned_scout_id: string | null;
  company_id: string;
  location_id: string;
  locations?: { name: string } | null;
  companies?: { name: string } | null;
}

/** Available jobs (posted, not assigned) */
export function useAvailableJobs() {
  const { scoutId } = useScoutAuth();
  return useQuery({
    queryKey: ["scout-feed", "available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scout_jobs")
        .select("*, locations(name), companies:company_id(name)")
        .eq("status", "posted")
        .is("assigned_scout_id", null)
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScoutFeedJob[];
    },
    enabled: !!scoutId,
  });
}

/** Jobs assigned to the current scout (accepted / in_progress / submitted) */
export function useMyJobs() {
  const { scoutId } = useScoutAuth();
  return useQuery({
    queryKey: ["scout-feed", "my-jobs", scoutId],
    queryFn: async () => {
      if (!scoutId) return [];
      const { data, error } = await supabase
        .from("scout_jobs")
        .select("*, locations(name), companies:company_id(name)")
        .eq("assigned_scout_id", scoutId)
        .in("status", ["accepted", "in_progress", "submitted"])
        .order("accepted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScoutFeedJob[];
    },
    enabled: !!scoutId,
  });
}

/** Completed jobs for history (approved / rejected / paid) */
export function useJobHistory() {
  const { scoutId } = useScoutAuth();
  return useQuery({
    queryKey: ["scout-feed", "history", scoutId],
    queryFn: async () => {
      if (!scoutId) return [];
      const { data, error } = await supabase
        .from("scout_jobs")
        .select("*, locations(name), companies:company_id(name)")
        .eq("assigned_scout_id", scoutId)
        .in("status", ["approved", "rejected", "paid"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScoutFeedJob[];
    },
    enabled: !!scoutId,
  });
}

/** Single job with steps */
export function useScoutJobDetail(jobId: string | undefined) {
  return useQuery({
    queryKey: ["scout-job-detail", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from("scout_jobs")
        .select("*, locations(name), companies:company_id(name)")
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data as ScoutFeedJob;
    },
    enabled: !!jobId,
  });
}

export function useScoutJobSteps(jobId: string | undefined) {
  return useQuery({
    queryKey: ["scout-job-steps", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("scout_job_steps")
        .select("*")
        .eq("job_id", jobId)
        .order("step_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!jobId,
  });
}

/** Accept a job via race-safe edge function */
export function useAcceptJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("scout-job-accept", {
        body: { jobId },
      });
      if (error) throw new Error(error.message || "Accept failed");
      if (data?.error) throw new Error(data.error);
      return data.job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scout-feed"] });
      queryClient.invalidateQueries({ queryKey: ["scout-job-detail"] });
      toast.success("Job accepted!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Start a job (create submission + set status) */
export function useStartJob() {
  const queryClient = useQueryClient();
  const { scoutId } = useScoutAuth();

  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!scoutId) throw new Error("No scout profile");
      // Create submission
      const { data: sub, error: subErr } = await supabase
        .from("scout_submissions")
        .insert({ job_id: jobId, scout_id: scoutId, status: "draft" })
        .select()
        .single();
      if (subErr) throw subErr;
      // Update job status
      await supabase
        .from("scout_jobs")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", jobId);
      return sub;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scout-feed"] });
      queryClient.invalidateQueries({ queryKey: ["scout-job-detail"] });
      toast.success("Job started!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Submit a job for review */
export function useSubmitJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      jobId,
      overallNotes,
    }: {
      submissionId: string;
      jobId: string;
      overallNotes?: string;
    }) => {
      const now = new Date().toISOString();
      const { error: sErr } = await supabase
        .from("scout_submissions")
        .update({ status: "submitted", submitted_at: now, overall_notes: overallNotes || null })
        .eq("id", submissionId);
      if (sErr) throw sErr;
      const { error: jErr } = await supabase
        .from("scout_jobs")
        .update({ status: "submitted", submitted_at: now })
        .eq("id", jobId);
      if (jErr) throw jErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scout-feed"] });
      queryClient.invalidateQueries({ queryKey: ["scout-job-detail"] });
      toast.success("Job submitted for review!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Save a step answer */
export function useSaveStepAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      submissionId: string;
      stepId: string;
      answerText?: string;
      answerBool?: boolean;
      answerNumber?: number;
    }) => {
      // Upsert: check if answer exists
      const { data: existing } = await supabase
        .from("scout_step_answers")
        .select("id")
        .eq("submission_id", params.submissionId)
        .eq("step_id", params.stepId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("scout_step_answers")
          .update({
            answer_text: params.answerText ?? null,
            answer_bool: params.answerBool ?? null,
            answer_number: params.answerNumber ?? null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("scout_step_answers").insert({
          submission_id: params.submissionId,
          step_id: params.stepId,
          answer_text: params.answerText ?? null,
          answer_bool: params.answerBool ?? null,
          answer_number: params.answerNumber ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scout-step-answers"] });
    },
  });
}

/** Get step answers for a submission */
export function useScoutStepAnswers(submissionId: string | undefined) {
  return useQuery({
    queryKey: ["scout-step-answers", submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const { data, error } = await supabase
        .from("scout_step_answers")
        .select("*")
        .eq("submission_id", submissionId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!submissionId,
  });
}

/** Get the current scout's submission for a job */
export function useScoutSubmissionForJob(jobId: string | undefined) {
  const { scoutId } = useScoutAuth();
  return useQuery({
    queryKey: ["scout-submission-for-job", jobId, scoutId],
    queryFn: async () => {
      if (!jobId || !scoutId) return null;
      const { data, error } = await supabase
        .from("scout_submissions")
        .select("*")
        .eq("job_id", jobId)
        .eq("scout_id", scoutId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId && !!scoutId,
  });
}
