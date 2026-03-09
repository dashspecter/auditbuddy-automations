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
    // Auth validation
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

    // Verify company membership
    const { data: companyUser, error: companyError } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (companyError || !companyUser) {
      return new Response(JSON.stringify({ error: "No company found for user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_base64 } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Determine mime type from base64 header or default to jpeg
    let mimeType = "image/jpeg";
    let cleanBase64 = image_base64;
    if (image_base64.startsWith("data:")) {
      const match = image_base64.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        cleanBase64 = match[2];
      }
    }

    const systemPrompt = `You are a document scanner specializing in Romanian identity documents: Carte de Identitate (CI), Pașaport, and Permis de Ședere (Residence Permit).

Analyze the uploaded image and extract all visible fields. Be precise with Romanian diacritics (ă, â, î, ș, ț).

For dates, use the format YYYY-MM-DD.

Auto-detect the document type:
- If it's a Romanian CI (Carte de Identitate): set is_foreign=false, extract serie_id, numar_id, cnp, domiciliu, localitate, emisa_de, valabila_de_la, valabilitate_id
- If it's a Residence Permit (Permis de Ședere): set is_foreign=true, extract nr_permis_sedere, permis_institutie_emitenta, permis_data_eliberare, permis_data_expirare
- If it's a Work Permit/Aviz: set is_foreign=true, extract numar_aviz, aviz_institutie, aviz_data_eliberare

Extract the person's full name in all cases.
Only extract fields that are clearly visible. Leave others empty.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${cleanBase64}` },
              },
              {
                type: "text",
                text: "Extract all identity document fields from this image.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_id_fields",
              description: "Extract structured fields from a Romanian identity document image.",
              parameters: {
                type: "object",
                properties: {
                  document_type: {
                    type: "string",
                    enum: ["carte_identitate", "pasaport", "permis_sedere", "aviz_munca"],
                    description: "Type of document detected",
                  },
                  full_name: { type: "string", description: "Full name of the person" },
                  cnp: { type: "string", description: "CNP (Cod Numeric Personal)" },
                  domiciliu: { type: "string", description: "Full address / domiciliu" },
                  localitate: { type: "string", description: "City/locality" },
                  serie_id: { type: "string", description: "ID card series (e.g. RD)" },
                  numar_id: { type: "string", description: "ID card number" },
                  emisa_de: { type: "string", description: "Issuing authority (e.g. SPCLEP Sector 1)" },
                  valabila_de_la: { type: "string", description: "Valid from date (YYYY-MM-DD)" },
                  valabilitate_id: { type: "string", description: "Expiry date (YYYY-MM-DD)" },
                  is_foreign: { type: "boolean", description: "True if non-Romanian citizen" },
                  nr_permis_sedere: { type: "string", description: "Residence permit number" },
                  permis_institutie_emitenta: { type: "string", description: "Residence permit issuing institution" },
                  permis_data_eliberare: { type: "string", description: "Residence permit issue date (YYYY-MM-DD)" },
                  permis_data_expirare: { type: "string", description: "Residence permit expiry date (YYYY-MM-DD)" },
                  numar_aviz: { type: "string", description: "Work permit (aviz) number" },
                  aviz_institutie: { type: "string", description: "Work permit issuing institution" },
                  aviz_data_eliberare: { type: "string", description: "Work permit issue date (YYYY-MM-DD)" },
                },
                required: ["document_type", "full_name"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_id_fields" } },
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
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured data returned from AI");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scan-id-document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
