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

    const { storagePath } = await req.json();
    if (!storagePath) {
      return new Response(JSON.stringify({ error: "storagePath required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Resolve company_id from the database, NOT from user-controlled path.
    // Extracting companyId from storagePath would let any user forge a path to
    // pass the company membership check.
    const serviceClientForLookup = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: mediaRecord, error: mediaError } = await serviceClientForLookup
      .from("scout_media")
      .select("id, scout_submissions(scout_jobs(company_id, assigned_scout_id))")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (mediaError || !mediaRecord) {
      return new Response(JSON.stringify({ error: "Media not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const job = (mediaRecord as any).scout_submissions?.scout_jobs;
    const companyId: string | null = job?.company_id ?? null;

    if (!companyId) {
      return new Response(JSON.stringify({ error: "Media not associated with a company" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is the assigned scout for this job or an org manager
    const assignedScoutId: string | null = job?.assigned_scout_id ?? null;

    const { data: scout } = await supabase
      .from("scouts")
      .select("id, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: companyUser } = await supabase
      .from("company_users")
      .select("company_role")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    // Scout must be the one assigned to this job
    const isAssignedScout = !!scout && (assignedScoutId === scout.id || assignedScoutId === userId);
    const isManager = !!companyUser;

    if (!isAssignedScout && !isManager) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reuse the service client already created for the media lookup
    const serviceClient = serviceClientForLookup;

    const { data: signedData, error: signError } = await serviceClient.storage
      .from("scout-evidence")
      .createSignedUrl(storagePath, 600); // 10 minutes

    if (signError) {
      return new Response(JSON.stringify({ error: signError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log view action
    await serviceClient.from("scout_audit_log").insert({
      actor_user_id: userId,
      action: "view_evidence",
      entity_type: "scout_media",
      entity_id: storagePath,
      metadata: { storagePath, viewerType: isAssignedScout ? "scout" : "manager" },
    });

    return new Response(
      JSON.stringify({ signedUrl: signedData.signedUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
