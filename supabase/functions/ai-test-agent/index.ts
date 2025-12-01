import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, testResults } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "analyze") {
      systemPrompt = `You are an expert QA engineer and application tester. Analyze the provided test results and application structure to identify:
1. Routing issues (redirects not working, wrong routes, missing routes)
2. Missing features or functionality
3. UI/UX problems
4. Performance issues
5. Security concerns
6. Accessibility issues

Provide a detailed report with:
- Issue severity (Critical, High, Medium, Low)
- Specific page/component affected
- Description of the issue
- Recommended fix
- Priority order for fixes`;

      userPrompt = `Analyze this DashSpect application test results and provide a comprehensive report:

Test Results:
${JSON.stringify(testResults, null, 2)}

Application Structure:
- Multi-tenant restaurant inspection/audit management system
- User roles: Platform Admin, Company Owner, Manager, Checker
- Key modules: Audits, Locations, Workforce, Equipment, Reports, Notifications
- Tech stack: React, Supabase, TypeScript

Provide a structured report with actionable recommendations.`;
    } else if (action === "generate-fixes") {
      systemPrompt = `You are an expert developer. Based on the issues identified, provide specific code fixes.
Return JSON array of fixes with structure:
{
  "fixes": [
    {
      "file": "path/to/file.tsx",
      "issue": "description",
      "severity": "critical|high|medium|low",
      "fix": "detailed fix instructions",
      "codeSnippet": "suggested code if applicable"
    }
  ]
}`;

      userPrompt = `Generate specific fixes for these issues:
${JSON.stringify(testResults, null, 2)}`;
    }

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI Gateway request failed");
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-test-agent:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});