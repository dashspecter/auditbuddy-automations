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

    const { jobId, stepId, submissionId, fileName, contentType } = await req.json();
    if (!jobId || !stepId || !submissionId || !fileName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get scout id
    const { data: scout } = await supabase
      .from("scouts")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (!scout) {
      return new Response(JSON.stringify({ error: "No scout profile" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate: caller is assigned scout, job is accepted/in_progress
    const { data: job } = await supabase
      .from("scout_jobs")
      .select("id, company_id, assigned_scout_id, status")
      .eq("id", jobId)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (job.assigned_scout_id !== scout.id) {
      return new Response(JSON.stringify({ error: "Not assigned to this job" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["accepted", "in_progress"].includes(job.status)) {
      return new Response(JSON.stringify({ error: "Job not in uploadable state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build storage path
    const ext = fileName.split(".").pop() || "jpg";
    const mediaId = crypto.randomUUID();
    const storagePath = `${job.company_id}/${jobId}/${submissionId}/${mediaId}.${ext}`;

    // Create signed upload URL using service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: signedData, error: signError } = await serviceClient.storage
      .from("scout-evidence")
      .createSignedUploadUrl(storagePath);

    if (signError) {
      return new Response(JSON.stringify({ error: signError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log in audit
    await serviceClient.from("scout_audit_log").insert({
      actor_user_id: userId,
      action: "upload_evidence",
      entity_type: "scout_media",
      entity_id: mediaId,
      metadata: { jobId, stepId, submissionId, storagePath },
    });

    return new Response(
      JSON.stringify({
        signedUrl: signedData.signedUrl,
        token: signedData.token,
        storagePath,
        mediaId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
