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

    // Parse form-encoded body from Twilio
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    
    const messageSid = params.get("MessageSid");
    const messageStatus = params.get("MessageStatus") || params.get("SmsStatus");
    const from = params.get("From");
    const body = params.get("Body");
    const errorCode = params.get("ErrorCode");
    const errorMessage = params.get("ErrorMessage");

    console.log("Webhook received:", { messageSid, messageStatus, from, body });

    // Handle STOP keyword (opt-out)
    if (body && body.trim().toUpperCase() === "STOP" && from) {
      const phoneClean = from.replace("whatsapp:", "");
      
      const { error: optOutErr } = await supabase
        .from("employee_messaging_preferences")
        .update({ opted_out_at: new Date().toISOString(), whatsapp_opt_in: false })
        .eq("phone_e164", phoneClean);

      if (optOutErr) {
        console.error("Opt-out update error:", optOutErr);
      } else {
        console.log("Employee opted out:", phoneClean);
      }

      return new Response("<Response></Response>", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // Handle status callback
    if (messageSid && messageStatus) {
      // Find the outbound message
      const { data: msg } = await supabase
        .from("outbound_messages")
        .select("id")
        .eq("provider_message_sid", messageSid)
        .single();

      if (msg) {
        const now = new Date().toISOString();
        const updateData: Record<string, any> = { status: messageStatus };

        switch (messageStatus) {
          case "delivered":
            updateData.delivered_at = now;
            break;
          case "read":
            updateData.read_at = now;
            break;
          case "failed":
          case "undelivered":
            updateData.status = "failed";
            updateData.failed_at = now;
            updateData.error_code = errorCode || null;
            updateData.error_message = errorMessage || null;
            break;
          case "sent":
            updateData.sent_at = now;
            break;
        }

        await supabase.from("outbound_messages").update(updateData).eq("id", msg.id);

        // Log event
        await supabase.from("message_events").insert({
          message_id: msg.id,
          status: messageStatus,
          raw_provider_payload: Object.fromEntries(params.entries()),
        });
      }
    }

    return new Response("<Response></Response>", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });

  } catch (err) {
    console.error("whatsapp-webhook error:", err);
    return new Response("<Response></Response>", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  }
});
