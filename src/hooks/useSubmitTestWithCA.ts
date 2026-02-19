import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubmitTestArgs {
  testId: string;
  testTitle: string;
  employeeId: string;
  staffName?: string;
  staffLocation?: string;
  locationId?: string;
  score: number;
  passed: boolean;
  timeTakenMinutes?: number;
  passThreshold?: number; // percentage, e.g. 70
  answers?: Record<string, unknown>; // question answers — defaults to {}
}

/**
 * Submits a test result and, if the employee failed,
 * fires the process-capa-rules edge function with trigger_type = "test_fail".
 *
 * Usage:
 *   const submit = useSubmitTestWithCA();
 *   await submit.mutateAsync({ testId, testTitle, employeeId, score, passed, ... });
 */
export function useSubmitTestWithCA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: SubmitTestArgs): Promise<{ submissionId: string; caIds: string[] }> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // 1. Save the test submission
      const insertPayload = {
        test_id: args.testId,
        employee_id: args.employeeId,
        staff_name: args.staffName ?? null,
        staff_location: args.staffLocation ?? null,
        score: args.score,
        passed: args.passed,
        completed_at: new Date().toISOString(),
        time_taken_minutes: args.timeTakenMinutes ?? null,
        answers: (args.answers ?? {}) as import("@/integrations/supabase/types").Json,
      };

      const { data: submission, error: subErr } = await supabase
        .from("test_submissions")
        .insert(insertPayload)
        .select("id")
        .single();

      if (subErr || !submission) throw subErr ?? new Error("Failed to save test submission");

      // 2. If the employee failed, fire the CAPA rules engine
      let caIds: string[] = [];
      if (!args.passed) {
        try {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/process-capa-rules`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                trigger_type: "test_fail",
                context: {
                  test_submission_id: submission.id,
                  test_id: args.testId,
                  test_title: args.testTitle,
                  employee_id: args.employeeId,
                  location_id: args.locationId ?? null,
                  score: args.score,
                  pass_threshold: args.passThreshold ?? 70,
                },
              }),
            }
          );

          if (res.ok) {
            const json = await res.json();
            caIds = json.ca_ids ?? [];
          } else {
            // Non-fatal: log but don't block the submission
            console.warn("[useSubmitTestWithCA] CAPA rules engine returned non-OK:", res.status);
          }
        } catch (capaErr) {
          // Non-fatal: the submission is already saved
          console.warn("[useSubmitTestWithCA] Failed to trigger CAPA rules:", capaErr);
        }
      }

      return { submissionId: submission.id, caIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["corrective_actions"] });
    },
  });
}
