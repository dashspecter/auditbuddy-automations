import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Use service role to call the refresh function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const startTime = Date.now();

    // Call the database function that refreshes all materialized views
    const { error } = await supabase.rpc("refresh_dashboard_materialized_views");

    const durationMs = Date.now() - startTime;

    if (error) {
      console.error("Failed to refresh materialized views:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message, duration_ms: durationMs }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Materialized views refreshed successfully in ${durationMs}ms`);

    return new Response(
      JSON.stringify({ success: true, duration_ms: durationMs, refreshed_at: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error refreshing materialized views:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
