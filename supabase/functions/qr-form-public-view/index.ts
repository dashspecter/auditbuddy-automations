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
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch the location_form_template by public_token
    const { data: lft, error: lftErr } = await supabase
      .from("location_form_templates")
      .select(`
        id, public_token, is_active, overrides,
        template_id, template_version_id,
        form_templates(name, category, type),
        form_template_versions(version, schema),
        locations!location_form_templates_location_id_fkey(name)
      `)
      .eq("public_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (lftErr) throw lftErr;
    if (!lft) {
      return new Response(JSON.stringify({ error: "Not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch the latest form_submissions for current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data: submissions, error: subErr } = await supabase
      .from("form_submissions")
      .select("id, data, status, period_month, period_year, submitted_at, updated_at")
      .eq("location_form_template_id", lft.id)
      .eq("period_year", year)
      .eq("period_month", month)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (subErr) throw subErr;

    return new Response(
      JSON.stringify({
        templateName: (lft as any).form_templates?.name || "Form",
        templateType: (lft as any).form_templates?.type || "log",
        templateCategory: (lft as any).form_templates?.category || "",
        locationName: (lft as any).locations?.name || "Location",
        schema: (lft as any).form_template_versions?.schema || null,
        version: (lft as any).form_template_versions?.version || 1,
        overrides: lft.overrides,
        submissions: submissions || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
