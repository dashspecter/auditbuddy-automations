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
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Allow service-role key or anon key for internal/cron calls
    const isServiceCall = authHeader === `Bearer ${serviceRoleKey}` || authHeader === `Bearer ${supabaseAnonKey}`;
    
    let userId: string | null = null;
    
    if (isServiceCall || !authHeader) {
      // Internal call - no user auth needed (function is behind verify_jwt=false)
      userId = "system";
    } else if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Auth error:", userError?.message || "No user");
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      userId = user.id;
    }

    const body = await req.json();
    const { company_id, employee_id, template_name, variables, event_type, event_ref_id } = body;

    if (!company_id || !employee_id || !template_name) {
      return new Response(JSON.stringify({ error: "Missing required fields: company_id, employee_id, template_name" }), { status: 400, headers: corsHeaders });
    }

    // Use service client for all DB queries
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get active messaging channel
    const { data: channel, error: channelErr } = await serviceClient
      .from("messaging_channels")
      .select("*")
      .eq("company_id", company_id)
      .eq("channel_type", "whatsapp")
      .eq("status", "active")
      .single();

    if (channelErr || !channel) {
      console.error("Channel error:", channelErr?.message);
      return new Response(JSON.stringify({ error: "No active WhatsApp channel configured" }), { status: 400, headers: corsHeaders });
    }

    // 2. Get employee messaging preferences
    const { data: prefs, error: prefsErr } = await serviceClient
      .from("employee_messaging_preferences")
      .select("*")
      .eq("employee_id", employee_id)
      .eq("company_id", company_id)
      .single();

    if (prefsErr || !prefs) {
      console.error("Prefs error:", prefsErr?.message);
      return new Response(JSON.stringify({ error: "Employee messaging preferences not found" }), { status: 400, headers: corsHeaders });
    }

    // Check opt-in
    if (!prefs.whatsapp_opt_in || prefs.opted_out_at) {
      return new Response(JSON.stringify({ error: "Employee has not opted in to WhatsApp", code: "NOT_OPTED_IN" }), { status: 400, headers: corsHeaders });
    }

    // Check quiet hours
    if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Bucharest',
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
      const currentTime = formatter.format(new Date());
      const start = prefs.quiet_hours_start;
      const end = prefs.quiet_hours_end;
      
      const inQuietHours = start > end
        ? currentTime >= start || currentTime < end
        : currentTime >= start && currentTime < end;
      
      if (inQuietHours) {
        return new Response(JSON.stringify({ error: "Message blocked: quiet hours active", code: "QUIET_HOURS" }), { status: 400, headers: corsHeaders });
      }
    }

    // Check daily throttle
    const today = new Date().toISOString().split("T")[0];
    const { count: todayCount } = await serviceClient
      .from("outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee_id)
      .eq("company_id", company_id)
      .gte("created_at", today + "T00:00:00Z");

    if ((todayCount || 0) >= (prefs.max_messages_per_day || 20)) {
      return new Response(JSON.stringify({ error: "Daily message limit reached", code: "THROTTLED" }), { status: 429, headers: corsHeaders });
    }

    // 3. Get approved template
    const { data: template, error: tplErr } = await serviceClient
      .from("wa_message_templates")
      .select("*")
      .eq("company_id", company_id)
      .eq("name", template_name)
      .eq("approval_status", "approved")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (tplErr || !template) {
      console.error("Template error:", tplErr?.message);
      return new Response(JSON.stringify({ error: `Template '${template_name}' not found or not approved` }), { status: 400, headers: corsHeaders });
    }

    // 4. Idempotency check
    const idempotencyKey = `${event_type || "manual"}:${event_ref_id || "none"}:${employee_id}:${today}`;
    const { data: existing } = await serviceClient
      .from("outbound_messages")
      .select("id, status")
      .eq("idempotency_key", idempotencyKey)
      .single();
    
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

    // Render template body with named variable placeholders (Fix 4)
    let renderedBody = template.body || "";
    const vars = variables || {};
    Object.entries(vars).forEach(([key, value]) => {
      renderedBody = renderedBody.replaceAll(`{{${key}}}`, String(value));
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
