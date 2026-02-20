import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Timing-safe comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Validate Twilio signature per https://www.twilio.com/docs/usage/security#validating-requests
async function validateTwilioSignature(
  url: string,
  params: URLSearchParams,
  signature: string,
  authToken: string
): Promise<boolean> {
  // Sort params alphabetically and concatenate key+value
  const sortedKeys = [...params.keys()].sort();
  let dataString = url;
  for (const key of sortedKeys) {
    dataString += key + params.get(key);
  }

  // HMAC-SHA1
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(dataString));
  const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  return timingSafeEqual(computedSignature, signature);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse form-encoded body from Twilio
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    // Fix 1: Validate Twilio signature
    if (twilioAuthToken) {
      const twilioSignature = req.headers.get("X-Twilio-Signature");
      if (!twilioSignature) {
        console.warn("Missing X-Twilio-Signature header");
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }

      // Construct the webhook URL from the request
      const webhookUrl = new URL(req.url).toString().split("?")[0];
      const isValid = await validateTwilioSignature(webhookUrl, params, twilioSignature, twilioAuthToken);
      if (!isValid) {
        console.warn("Invalid Twilio signature");
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
    } else {
      console.warn("TWILIO_AUTH_TOKEN not set — skipping signature validation");
    }
    
    const messageSid = params.get("MessageSid");
    const messageStatus = params.get("MessageStatus") || params.get("SmsStatus");
    const from = params.get("From");
    const body = params.get("Body");
    const errorCode = params.get("ErrorCode");
    const errorMessage = params.get("ErrorMessage");

    console.log("Webhook received:", { messageSid, messageStatus, from, body });

    // Handle STOP keyword (opt-out) — Fix 5: scope by company
    if (body && body.trim().toUpperCase() === "STOP" && from) {
      const phoneClean = from.replace("whatsapp:", "");
      const now = new Date().toISOString();

      // Find company from most recent outbound message to this phone
      const { data: recentMsg } = await supabase
        .from("outbound_messages")
        .select("company_id")
        .eq("recipient_phone_e164", phoneClean)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentMsg?.company_id) {
        const { error: optOutErr } = await supabase
          .from("employee_messaging_preferences")
          .update({ opted_out_at: now, whatsapp_opt_in: false })
          .eq("phone_e164", phoneClean)
          .eq("company_id", recentMsg.company_id);

        if (optOutErr) {
          console.error("Opt-out update error:", optOutErr);
        } else {
          console.log("Employee opted out:", phoneClean, "company:", recentMsg.company_id);
        }
      } else {
        console.warn("STOP received but no recent outbound message found for:", phoneClean);
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
