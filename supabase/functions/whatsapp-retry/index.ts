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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!twilioSid || !twilioToken) {
      return new Response(JSON.stringify({ error: "Twilio credentials not configured" }), { status: 500, headers: corsHeaders });
    }

    // Find failed messages eligible for retry
    const now = new Date().toISOString();
    const { data: failedMessages, error: queryErr } = await supabase
      .from("outbound_messages")
      .select("*, wa_message_templates(*)")
      .eq("status", "failed")
      .lt("retry_count", 3)
      .lte("next_retry_at", now)
      .limit(50);

    if (queryErr) {
      console.error("Query error:", queryErr);
      return new Response(JSON.stringify({ error: "Failed to query messages" }), { status: 500, headers: corsHeaders });
    }

    if (!failedMessages || failedMessages.length === 0) {
      return new Response(JSON.stringify({ message: "No messages to retry", count: 0 }), { status: 200, headers: corsHeaders });
    }

    let retried = 0;
    let failed = 0;

    for (const msg of failedMessages) {
      try {
        // Get channel for this company
        const { data: channel } = await supabase
          .from("messaging_channels")
          .select("*")
          .eq("company_id", msg.company_id)
          .eq("channel_type", "whatsapp")
          .eq("status", "active")
          .single();

        if (!channel) {
          console.log(`No active channel for company ${msg.company_id}`);
          failed++;
          continue;
        }

        // Render body
        let renderedBody = msg.wa_message_templates?.body || "";
        const vars = msg.variables || {};
        Object.keys(vars).forEach((key, idx) => {
          renderedBody = renderedBody.replace(`{{${idx + 1}}}`, vars[key]);
        });

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const formData = new URLSearchParams();
        formData.append("From", `whatsapp:${channel.phone_number_e164}`);
        formData.append("To", `whatsapp:${msg.recipient_phone_e164}`);
        
        if (msg.wa_message_templates?.provider_template_id) {
          formData.append("ContentSid", msg.wa_message_templates.provider_template_id);
          if (msg.variables) formData.append("ContentVariables", JSON.stringify(msg.variables));
        } else {
          formData.append("Body", renderedBody);
        }

        const response = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + btoa(`${twilioSid}:${twilioToken}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        const result = await response.json();
        const newRetryCount = (msg.retry_count || 0) + 1;

        if (response.ok) {
          await supabase.from("outbound_messages").update({
            status: "sent",
            provider_message_sid: result.sid,
            sent_at: new Date().toISOString(),
            retry_count: newRetryCount,
          }).eq("id", msg.id);

          await supabase.from("message_events").insert({
            message_id: msg.id,
            status: "sent",
            raw_provider_payload: result,
          });

          retried++;
        } else {
          // Exponential backoff: 1m, 5m, 30m
          const backoffMs = [60000, 300000, 1800000][Math.min(newRetryCount, 2)];
          
          await supabase.from("outbound_messages").update({
            retry_count: newRetryCount,
            next_retry_at: newRetryCount >= 3 ? null : new Date(Date.now() + backoffMs).toISOString(),
            error_code: String(result.code || response.status),
            error_message: result.message || "Retry failed",
            status: newRetryCount >= 3 ? "failed" : "failed", // stays failed until sent
          }).eq("id", msg.id);

          failed++;
        }
      } catch (err) {
        console.error(`Retry error for msg ${msg.id}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({ message: "Retry complete", retried, failed, total: failedMessages.length }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("whatsapp-retry error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
