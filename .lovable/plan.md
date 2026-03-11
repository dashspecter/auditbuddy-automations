

## Problem

Twilio error **63016**: "Failed to send freeform message because you are outside the allowed window. Please use a Message Template."

The `task_upcoming` template has no `provider_template_id` (Twilio Content SID). Without it, the edge function sends a freeform `Body` message, which WhatsApp only allows within a 24-hour session window (after the recipient messages you first). Outside that window, you **must** use an approved WhatsApp Message Template via Twilio's Content API.

## Solution

Two changes:

### 1. Prevent sending templates without a Content SID (code fix)

Add validation in the broadcast edge function to reject sends when `provider_template_id` is missing — returning a clear error instead of silently failing at Twilio.

**File:** `supabase/functions/whatsapp-broadcast/index.ts`
- After fetching the template, check if `provider_template_id` is set
- If not, return an error: `"Template missing Twilio Content SID (provider_template_id). Set it in Templates settings."`

Also add a warning in the broadcast UI (`WhatsAppBroadcast.tsx`) — filter the template dropdown to only show templates that have a `provider_template_id`, or show a warning badge next to templates missing one.

### 2. Add guidance in the Templates page (UX fix)

**File:** `src/pages/WhatsAppTemplates.tsx`
- Show a warning indicator on templates where `provider_template_id` is empty
- Add helper text explaining that the Content SID (`HX...`) is required for sending outside the 24-hour window

## What you need to do

1. Create a Content Template in your Twilio Console (Messaging → Content Editor) that matches your `task_upcoming` template
2. Copy the Content SID (starts with `HX...`)
3. Go to **WhatsApp → Templates** in your app, edit `task_upcoming`, and paste the Content SID into the "Provider Template ID" field
4. Then re-send the broadcast

