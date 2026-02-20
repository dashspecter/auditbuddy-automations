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

    const body = await req.json();
    const { company_id, template_id, variables, scope, scheduled_for } = body;

    if (!company_id || !template_id) {
      return new Response(JSON.stringify({ error: "Missing company_id or template_id" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get template
    const { data: template, error: tplErr } = await supabase
      .from("wa_message_templates")
      .select("*")
      .eq("id", template_id)
      .eq("company_id", company_id)
      .eq("approval_status", "approved")
      .single();

    if (tplErr || !template) {
      return new Response(JSON.stringify({ error: "Template not found or not approved" }), { status: 400, headers: corsHeaders });
    }

    // Resolve recipients
    let query = supabase
      .from("employee_messaging_preferences")
      .select("employee_id, phone_e164")
      .eq("company_id", company_id)
      .eq("whatsapp_opt_in", true)
      .is("opted_out_at", null);

    // If scope has location_ids, filter by employee location
    if (scope?.location_ids?.length > 0) {
      const { data: employees } = await supabase
        .from("employees")
        .select("id")
        .eq("company_id", company_id)
        .in("location_id", scope.location_ids);
      
      if (employees) {
        const empIds = employees.map((e: any) => e.id);
        query = query.in("employee_id", empIds);
      }
    }

    if (scope?.employee_ids?.length > 0) {
      query = query.in("employee_id", scope.employee_ids);
    }

    const { data: recipients, error: recipErr } = await query;

    if (recipErr || !recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No eligible recipients found", count: 0 }), { status: 200, headers: corsHeaders });
    }

    // Insert messages in batches
    const today = new Date().toISOString().split("T")[0];
    const messages = recipients.map((r: any) => ({
      company_id,
      employee_id: r.employee_id,
      channel: "whatsapp",
      template_id: template.id,
      event_type: "announcement",
      recipient_phone_e164: r.phone_e164,
      variables: variables || {},
      idempotency_key: `broadcast:${template_id}:${r.employee_id}:${today}`,
      status: scheduled_for ? "queued" : "queued",
      scheduled_for: scheduled_for || null,
    }));

    // Process in batches of 50
    const batchSize = 50;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const { data, error } = await serviceClient
        .from("outbound_messages")
        .insert(batch)
        .select("id");

      if (error) {
        console.error("Batch insert error:", error);
        errors += batch.length;
      } else {
        inserted += (data?.length || 0);
      }
    }

    // If not scheduled, trigger sends immediately via send-whatsapp
    if (!scheduled_for && inserted > 0) {
      // Fetch queued messages and send via Twilio
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

      if (twilioSid && twilioToken) {
        const { data: channel } = await supabase
          .from("messaging_channels")
          .select("*")
          .eq("company_id", company_id)
          .eq("channel_type", "whatsapp")
          .eq("status", "active")
          .single();

        if (channel) {
          const { data: queued } = await serviceClient
            .from("outbound_messages")
            .select("*")
            .eq("company_id", company_id)
            .eq("status", "queued")
            .eq("event_type", "announcement")
            .eq("template_id", template_id)
            .limit(inserted);

          let sent = 0;
          for (const msg of (queued || [])) {
            try {
              let renderedBody = template.body || "";
              const vars = msg.variables || {};
              Object.entries(vars).forEach(([key, value]) => {
                renderedBody = renderedBody.replaceAll(`{{${key}}}`, String(value));
              });

              const formData = new URLSearchParams();
              formData.append("From", `whatsapp:${channel.phone_number_e164}`);
              formData.append("To", `whatsapp:${msg.recipient_phone_e164}`);
              
              if (template.provider_template_id) {
                formData.append("ContentSid", template.provider_template_id);
                if (msg.variables) formData.append("ContentVariables", JSON.stringify(msg.variables));
              } else {
                formData.append("Body", renderedBody);
              }

              const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
                {
                  method: "POST",
                  headers: {
                    "Authorization": "Basic " + btoa(`${twilioSid}:${twilioToken}`),
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: formData.toString(),
                }
              );

              const result = await response.json();

              if (response.ok) {
                await serviceClient.from("outbound_messages").update({
                  status: "sent",
                  provider_message_sid: result.sid,
                  sent_at: new Date().toISOString(),
                }).eq("id", msg.id);
                sent++;
              } else {
                await serviceClient.from("outbound_messages").update({
                  status: "failed",
                  error_code: String(result.code || response.status),
                  error_message: result.message,
                  failed_at: new Date().toISOString(),
                  next_retry_at: new Date(Date.now() + 60000).toISOString(),
                }).eq("id", msg.id);
              }

              // Rate limit: small delay between sends
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
              console.error("Send error for msg:", msg.id, err);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_recipients: recipients.length,
      inserted,
      errors,
      scheduled: !!scheduled_for,
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("whatsapp-broadcast error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
