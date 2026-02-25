import { supabase } from "@/integrations/supabase/client";

interface SaveTaskEvidencePolicyParams {
  companyId: string;
  taskId: string;
  evidenceRequired: boolean;
  reviewRequired: boolean;
  instructions: string;
  existingPolicyId: string | null;
}

/**
 * Shared helper for saving/removing evidence policy on a task.
 * Used by both TaskNew and TaskEdit.
 * Returns the policy ID if created/updated, or null if removed.
 */
export async function saveTaskEvidencePolicy({
  companyId,
  taskId,
  evidenceRequired,
  reviewRequired,
  instructions,
  existingPolicyId,
}: SaveTaskEvidencePolicyParams): Promise<{ policyId: string | null; error: string | null }> {
  if (!companyId || !taskId) {
    return { policyId: null, error: "Missing company or task ID" };
  }

  if (evidenceRequired) {
    const { data, error } = await supabase
      .from("evidence_policies")
      .upsert(
        {
          company_id: companyId,
          applies_to: "task_template",
          applies_id: taskId,
          evidence_required: true,
          review_required: reviewRequired,
          required_media_types: ["photo"],
          min_media_count: 1,
          instructions: instructions.trim() || null,
        },
        { onConflict: "company_id,applies_to,applies_id" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[saveTaskEvidencePolicy] upsert failed:", error);
      return { policyId: existingPolicyId, error: error.message };
    }

    return { policyId: data?.id ?? existingPolicyId, error: null };
  }

  // Evidence not required — remove policy if one exists
  if (existingPolicyId) {
    const { error } = await supabase
      .from("evidence_policies")
      .delete()
      .eq("id", existingPolicyId);

    if (error) {
      console.error("[saveTaskEvidencePolicy] delete failed:", error);
      return { policyId: existingPolicyId, error: error.message };
    }
  }

  return { policyId: null, error: null };
}
