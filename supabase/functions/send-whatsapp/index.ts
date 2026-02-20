import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { company_id, employee_id, template_name, variables, event_type, event_ref_id } = body;

    if (!company_id || !employee_id || !template_name) {
      return new Response(JSON.stringify({ error: "Missing required fields: company_id, employee_id, template_name" }), { status: 400, headers: corsHeaders });
    }

    // 1. Get active messaging channel
    const { data: channel, error: channelErr } = await supabase
      .from("messaging_channels")
      .select("*")
      .eq("company_id", company_id)
      .eq("channel_type", "whatsapp")
      .eq("status", "active")
      .single();

    if (channelErr || !channel) {
      return new Response(JSON.stringify({ error: "No active WhatsApp channel configured" }), { status: 400, headers: corsHeaders });
    }

    // 2. Get employee messaging preferences
    const { data: prefs, error: prefsErr } = await supabase
      .from("employee_messaging_preferences")
      .select("*")
      .eq("employee_id", employee_id)
      .eq("company_id", company_id)
      .single();

    if (prefsErr || !prefs) {
      return new Response(JSON.stringify({ error: "Employee messaging preferences not found" }), { status: 400, headers: corsHeaders });
    }

    // Check opt-in
    if (!prefs.whatsapp_opt_in || prefs.opted_out_at) {
      return new Response(JSON.stringify({ error: "Employee has not opted in to WhatsApp", code: "NOT_OPTED_IN" }), { status: 400, headers: corsHeaders });
    }

    // Check quiet hours
    if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const start = prefs.quiet_hours_start;
      const end = prefs.quiet_hours_end;
      
      const inQuietHours = start > end
        ? currentTime >= start || currentTime < end  // overnight (e.g., 22:00-07:00)
        : currentTime >= start && currentTime < end;  // same-day
      
      if (inQuietHours) {
        return new Response(JSON.stringify({ error: "Message blocked: quiet hours active", code: "QUIET_HOURS" }), { status: 400, headers: corsHeaders });
      }
    }

    // Check daily throttle
    const today = new Date().toISOString().split("T")[0];
    const { count: todayCount } = await supabase
      .from("outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee_id)
      .eq("company_id", company_id)
      .gte("created_at", today + "T00:00:00Z");

    if ((todayCount || 0) >= (prefs.max_messages_per_day || 20)) {
      return new Response(JSON.stringify({ error: "Daily message limit reached", code: "THROTTLED" }), { status: 429, headers: corsHeaders });
    }

    // 3. Get approved template
    const { data: template, error: tplErr } = await supabase
      .from("wa_message_templates")
      .select("*")
      .eq("company_id", company_id)
      .eq("name", template_name)
      .eq("approval_status", "approved")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (tplErr || !template) {
      return new Response(JSON.stringify({ error: `Template '${template_name}' not found or not approved` }), { status: 400, headers: corsHeaders });
    }

    // 4. Idempotency check
    const idempotencyKey = `${event_type || "manual"}:${event_ref_id || "none"}:${employee_id}:${today}`;
    const { data: existing } = await supabase
      .from("outbound_messages")
      .select("id, status")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ message: "Duplicate message skipped", id: existing.id, status: existing.status }), { status: 200, headers: corsHeaders });
    }

    // 5. Insert queued message (use service role for insert)
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    const { data: msg, error: insertErr } = await serviceClient
      .from("outbound_messages")
      .insert({
        company_id,
        employee_id,
        channel: "whatsapp",
        template_id: template.id,
        event_type: event_type || "manual",
        event_ref_id: event_ref_id || null,
        recipient_phone_e164: prefs.phone_e164,
        variables: variables || {},
        idempotency_key: idempotencyKey,
        status: "queued",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to queue message" }), { status: 500, headers: corsHeaders });
    }

    // 6. Send via Twilio
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID") || channel.twilio_account_sid;
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!twilioSid || !twilioToken) {
      await serviceClient.from("outbound_messages").update({ status: "failed", error_message: "Twilio credentials not configured", failed_at: new Date().toISOString() }).eq("id", msg.id);
      return new Response(JSON.stringify({ error: "Twilio credentials not configured" }), { status: 500, headers: corsHeaders });
    }

    // Render template body with variables
    let renderedBody = template.body || "";
    const vars = variables || {};
    Object.keys(vars).forEach((key, idx) => {
      renderedBody = renderedBody.replace(`{{${idx + 1}}}`, vars[key]);
    });

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append("From", `whatsapp:${channel.phone_number_e164}`);
    formData.append("To", `whatsapp:${prefs.phone_e164}`);
    
    // Use template SID if available, otherwise send as freeform
    if (template.provider_template_id) {
      formData.append("ContentSid", template.provider_template_id);
      if (variables) {
        formData.append("ContentVariables", JSON.stringify(variables));
      }
    } else {
      formData.append("Body", renderedBody);
    }

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${twilioSid}:${twilioToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      await serviceClient.from("outbound_messages").update({
        status: "failed",
        error_code: String(twilioResult.code || twilioResponse.status),
        error_message: twilioResult.message || "Twilio API error",
        failed_at: new Date().toISOString(),
        next_retry_at: new Date(Date.now() + 60000).toISOString(), // 1 min retry
      }).eq("id", msg.id);

      return new Response(JSON.stringify({ error: "Failed to send via Twilio", details: twilioResult.message }), { status: 502, headers: corsHeaders });
    }

    // Success
    await serviceClient.from("outbound_messages").update({
      status: "sent",
      provider_message_sid: twilioResult.sid,
      sent_at: new Date().toISOString(),
    }).eq("id", msg.id);

    // Log event
    await serviceClient.from("message_events").insert({
      message_id: msg.id,
      status: "sent",
      raw_provider_payload: twilioResult,
    });

    return new Response(JSON.stringify({ success: true, message_id: msg.id, sid: twilioResult.sid }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("send-whatsapp error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
