import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { submissionId } = await req.json();
    if (!submissionId) {
      return new Response(JSON.stringify({ error: "submissionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get submission with job details
    const { data: submission, error: subErr } = await serviceClient
      .from("scout_submissions")
      .select("*, scout_jobs(title, company_id, location_id, assigned_scout_id)")
      .eq("id", submissionId)
      .single();

    if (subErr || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const job = submission.scout_jobs as any;

    // Authorization: must be org manager for the company
    const { data: companyUser } = await serviceClient
      .from("company_users")
      .select("company_role")
      .eq("user_id", userId)
      .eq("company_id", job.company_id)
      .single();

    if (!companyUser) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get steps and answers
    const { data: steps } = await serviceClient
      .from("scout_job_steps")
      .select("*")
      .eq("job_id", submission.job_id)
      .order("step_order");

    const { data: answers } = await serviceClient
      .from("scout_step_answers")
      .select("*")
      .eq("submission_id", submissionId);

    const { data: media } = await serviceClient
      .from("scout_media")
      .select("*")
      .eq("submission_id", submissionId);

    // Get location name
    const { data: location } = await serviceClient
      .from("locations")
      .select("name")
      .eq("id", job.location_id)
      .single();

    // Get company name
    const { data: company } = await serviceClient
      .from("companies")
      .select("name")
      .eq("id", job.company_id)
      .single();

    // Build the evidence packet as a structured JSON document
    // (Full PDF generation would require a PDF library; we store structured JSON
    // that can be rendered client-side or by a dedicated PDF service)
    const answerMap = new Map();
    (answers || []).forEach((a: any) => answerMap.set(a.step_id, a));

    const mediaByStep = new Map();
    (media || []).forEach((m: any) => {
      if (!mediaByStep.has(m.step_id)) mediaByStep.set(m.step_id, []);
      mediaByStep.get(m.step_id).push(m);
    });

    const packetData = {
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      company: { id: job.company_id, name: company?.name ?? "Unknown" },
      location: { id: job.location_id, name: location?.name ?? "Unknown" },
      job: {
        id: submission.job_id,
        title: job.title,
        scoutAnonymizedId: submission.scout_id.substring(0, 8),
      },
      submission: {
        id: submissionId,
        submittedAt: submission.submitted_at,
        reviewedAt: submission.reviewed_at,
        status: submission.status,
        overallNotes: submission.overall_notes,
        reviewerNotes: submission.reviewer_notes,
      },
      steps: (steps || []).map((step: any) => {
        const answer = answerMap.get(step.id);
        const stepMedia = mediaByStep.get(step.id) || [];
        return {
          order: step.step_order,
          prompt: step.prompt,
          type: step.step_type,
          required: step.is_required,
          answer: answer
            ? {
                text: answer.answer_text,
                bool: answer.answer_bool,
                number: answer.answer_number,
                status: answer.step_status,
                reviewerComment: answer.reviewer_comment,
              }
            : null,
          media: stepMedia.map((m: any) => ({
            id: m.id,
            type: m.media_type,
            storagePath: m.storage_path,
            capturedAt: m.captured_at,
          })),
        };
      }),
      mediaCount: (media || []).length,
    };

    // Store the packet as JSON in scout-evidence bucket
    const packetPath = `${job.company_id}/${submission.job_id}/${submissionId}/evidence-packet.json`;
    const packetBlob = new Blob([JSON.stringify(packetData, null, 2)], {
      type: "application/json",
    });

    const { error: uploadErr } = await serviceClient.storage
      .from("scout-evidence")
      .upload(packetPath, packetBlob, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: uploadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update submission with packet path
    await serviceClient
      .from("scout_submissions")
      .update({ packet_storage_path: packetPath })
      .eq("id", submissionId);

    // Log
    await serviceClient.from("scout_audit_log").insert({
      actor_user_id: userId,
      action: "generate_evidence_packet",
      entity_type: "scout_submission",
      entity_id: submissionId,
      metadata: { packetPath },
    });

    return new Response(
      JSON.stringify({ success: true, packetPath }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
