import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are DashSpect AI Guide, a helpful assistant that helps users understand and navigate the DashSpect platform. You have deep knowledge of all features:

**Core Modules:**
- **Location Audits**: Create and manage audit templates, perform location audits, track compliance scores, view audit history and reports
- **Equipment Management**: Track equipment, schedule maintenance, log interventions, manage equipment status and documents
- **Workforce Management**: Manage staff schedules, shifts, attendance, time-off requests, payroll, and employee performance
- **Notifications**: Create recurring notifications, manage notification templates, track notification history
- **Documents**: Upload and manage company documents, track required readings, set renewal dates
- **Reports**: Generate compliance reports, view trends, export data
- **Training & Tests**: Create training programs, assign tests to staff, track completion and scores

**User Roles:**
- **Admin**: Full access to all features, company settings, user management
- **Manager**: Location-level management, staff oversight, approvals
- **Checker**: Perform audits, equipment checks, basic data entry
- **Staff**: View schedules, clock in/out, complete assigned tasks and tests

**Key Features:**
- Dashboard with role-specific views and analytics
- Pull-to-refresh on most pages
- Mobile-optimized interface for field work
- Real-time notifications and alerts
- Photo capture for audits and equipment
- QR code attendance kiosks

Be friendly, concise, and provide step-by-step guidance. If asked about something outside the platform, politely redirect to platform-related help.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
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
        return new Response(JSON.stringify({ error: "AI credits depleted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI Guide error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
