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

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId required" }), {
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

    // Race-safe acceptance:
    // Only update if status='posted' AND assigned_scout_id IS NULL
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // Use service client for the atomic update
    const { data: updated, error: updateError } = await serviceClient
      .from("scout_jobs")
      .update({
        assigned_scout_id: scout.id,
        status: "accepted",
        accepted_at: now,
      })
      .eq("id", jobId)
      .eq("status", "posted")
      .is("assigned_scout_id", null)
      .select("id, title, company_id")
      .single();

    if (updateError || !updated) {
      return new Response(
        JSON.stringify({ error: "Job already taken or not available" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log acceptance
    await serviceClient.from("scout_audit_log").insert({
      actor_user_id: userId,
      action: "accept_job",
      entity_type: "scout_job",
      entity_id: jobId,
      metadata: { scoutId: scout.id, jobTitle: updated.title },
    });

    return new Response(
      JSON.stringify({ success: true, job: updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
