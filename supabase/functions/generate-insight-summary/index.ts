import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, alerts } = await req.json();
    
    if (!companyId) {
      return new Response(JSON.stringify({ error: "Company ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare the prompt with alert data
    const alertSummary = alerts?.length > 0 
      ? alerts.map((a: any) => `- ${a.severity.toUpperCase()}: ${a.title} - ${a.message}`).join("\n")
      : "No active alerts.";

    const prompt = `You are an AI assistant for a business management platform. Analyze the following active alerts and provide a concise executive summary with actionable insights.

Active Alerts:
${alertSummary}

Please provide:
1. A brief overview of the current situation
2. Key areas requiring attention
3. Recommended actions to address the issues
4. Any patterns or trends you notice

Format your response in HTML with appropriate headings and bullet points for readability.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a helpful business analyst AI. Provide clear, actionable insights in HTML format." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate summary");
    }

    const aiResponse = await response.json();
    const summaryContent = aiResponse.choices?.[0]?.message?.content || "Unable to generate summary.";

    // Save the summary to the database
    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const periodEnd = now.toISOString().split('T')[0];

    const { error: insertError } = await supabase.from("insight_summaries").insert({
      company_id: companyId,
      summary_type: "weekly",
      period_start: periodStart,
      period_end: periodEnd,
      content: { raw: summaryContent },
      content_html: summaryContent,
    });

    if (insertError) {
      console.error("Error saving summary:", insertError);
      throw new Error("Failed to save summary");
    }

    return new Response(JSON.stringify({ success: true, summary: summaryContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-insight-summary error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
