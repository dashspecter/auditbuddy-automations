import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audit_id } = await req.json();
    if (!audit_id) {
      return new Response(JSON.stringify({ error: "audit_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch audit with template and location
    const { data: audit, error: auditErr } = await supabase
      .from("audits")
      .select("*, audit_templates(name, description), locations(name)")
      .eq("id", audit_id)
      .single();

    if (auditErr || !audit) {
      return new Response(JSON.stringify({ error: "Audit not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sections
    const { data: sections } = await supabase
      .from("audit_sections")
      .select("id, name, description, display_order")
      .eq("template_id", audit.template_id)
      .order("display_order");

    // Fetch all fields for sections
    const sectionIds = (sections || []).map((s: any) => s.id);
    const { data: fields } = await supabase
      .from("audit_fields")
      .select("id, section_id, name, field_type, display_order")
      .in("section_id", sectionIds)
      .order("display_order");

    // Fetch all responses
    const { data: responses } = await supabase
      .from("audit_field_responses")
      .select("field_id, section_id, response_value, observations, created_by")
      .eq("audit_id", audit_id);

    // Build structured data for the AI
    const auditData = (sections || []).map((section: any) => {
      const sectionFields = (fields || []).filter((f: any) => f.section_id === section.id);
      const fieldData = sectionFields.map((field: any) => {
        const response = (responses || []).find((r: any) => r.field_id === field.id);
        return {
          question: field.name,
          type: field.field_type,
          answer: response?.response_value ?? null,
          observations: response?.observations ?? null,
        };
      });

      return {
        section: section.name,
        description: section.description,
        fields: fieldData,
      };
    });

    const totalFields = (fields || []).length;
    const answeredFields = (responses || []).filter((r: any) => r.response_value !== null).length;
    const completionPct = totalFields > 0 ? Math.round((answeredFields / totalFields) * 100) : 0;

    const systemPrompt = `You are a professional site assessment consultant. You are analyzing data from a "Site Visit Checklist" audit conducted at a potential new location for a food service / restaurant operation.

Your job is to produce THREE structured output documents from the raw field responses:

1. **CONSTRAINTS & DECISIONS (1-page summary)**
   - Storage decision (in-unit vs shared next door)
   - Ventilation status (confirmed / uncertain / problem)
   - Power status (confirmed / uncertain / upgrade likely)
   - Stage-1 scope bullets
   - Top risks and red flags

2. **WORKSTREAMS + OWNERS (2-month timeline)**
   - Doug: floor plan + layout + equipment placement + storage plan
   - Alex: area contacts + vendor shortlist + building coordination notes
   - Tech Ops: MEP checks + quotes + procurement list
   - People Ops: hiring plan + training calendar + onboarding needs
   - Franchisee: company data for signing + access scheduling + landlord coordination

3. **RFQ PACK SUMMARY (for contractor quotes)**
   - Key measurements
   - Scope of work summary
   - Photos/documentation reference
   - Target launch date placeholder
   - Request for 3 quotes: electrical, plumbing, HVAC/hood + general renovation

Format the output in clean markdown with headers, bullet points, and tables where appropriate.
If a field has no response, note it as "NOT RECORDED — needs follow-up".
Be specific, actionable, and professional.`;

    const userPrompt = `Here is the site visit audit data:

**Template:** ${audit.audit_templates?.name || "Site Visit"}
**Location:** ${audit.locations?.name || "Unknown"}
**Completion:** ${completionPct}% (${answeredFields}/${totalFields} fields completed)

## Audit Responses by Section

${JSON.stringify(auditData, null, 2)}

Please generate the three required output documents.`;

    // Call Lovable AI with streaming
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-site-visit-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
