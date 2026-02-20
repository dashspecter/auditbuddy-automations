

# Fix All 7 WhatsApp Audit Issues

## Overview
This plan addresses all 7 issues identified in the audit, in priority order. Changes span 4 Edge Functions and 2 frontend files.

---

## Fix 1 (P0): Twilio Signature Validation on Webhook

**File:** `supabase/functions/whatsapp-webhook/index.ts`

Add HMAC-SHA1 signature validation using the `X-Twilio-Signature` header before processing any payload. This prevents spoofed status callbacks and fake STOP opt-outs.

- Read the `X-Twilio-Signature` header
- Compute HMAC-SHA1 of the webhook URL + sorted params using `TWILIO_AUTH_TOKEN` as the key
- Compare with a timing-safe comparison
- Reject with 403 if invalid or missing

---

## Fix 2 (P0): Replace `useMessageStats` with Count Queries

**File:** `src/hooks/useWhatsApp.ts`

Replace the current `useMessageStats` hook (which fetches ALL rows and counts in JS) with individual `select("id", { count: "exact", head: true })` queries filtered by status. This avoids the 1,000-row limit and eliminates loading full payloads into browser memory.

The new implementation will run 4 parallel count queries (sent, delivered, read, failed) plus one total count, all server-side.

---

## Fix 3 (P1): Seed Templates as `approved`

**File:** `src/hooks/useCompany.ts`

Already fixed in the current code (line 344 shows `approval_status: "approved"`). Will verify and confirm -- no change needed.

---

## Fix 4 (P1): Named Variable Placeholders

**Files:** `supabase/functions/send-whatsapp/index.ts`, `supabase/functions/whatsapp-retry/index.ts`, `supabase/functions/whatsapp-broadcast/index.ts`

Replace the fragile index-based rendering:
```
Object.keys(vars).forEach((key, idx) => {
  renderedBody = renderedBody.replace(`{{${idx + 1}}}`, vars[key]);
});
```

With named-key replacement that also supports numbered placeholders:
```
Object.entries(vars).forEach(([key, value]) => {
  renderedBody = renderedBody.replaceAll(`{{${key}}}`, String(value));
});
```

Also update the default template bodies in `useCompany.ts` to use named placeholders (e.g., `{{task_name}}` instead of `{{1}}`), and update the UI placeholder hint in `WhatsAppTemplates.tsx`.

---

## Fix 5 (P1): Scope STOP Handler by Company

**File:** `supabase/functions/whatsapp-webhook/index.ts`

When a STOP message arrives, look up the most recent `outbound_messages` row sent to that phone number to determine the `company_id`, then scope the opt-out update to that company only.

```
// Find company from most recent message to this phone
const { data: recentMsg } = await supabase
  .from("outbound_messages")
  .select("company_id")
  .eq("recipient_phone_e164", phoneClean)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

if (recentMsg) {
  await supabase
    .from("employee_messaging_preferences")
    .update({ opted_out_at: now, whatsapp_opt_in: false })
    .eq("phone_e164", phoneClean)
    .eq("company_id", recentMsg.company_id);
}
```

---

## Fix 6 (P2): Add Delete Confirmation Dialog to Templates

**File:** `src/pages/WhatsAppTemplates.tsx`

Add an `AlertDialog` around the delete button (same pattern already used in `WhatsAppBroadcast.tsx`). Add state for `deleteTarget`, show confirmation with template name, and only call `deleteTemplate.mutate()` on confirm.

---

## Fix 7 (P2): Use Company Timezone for Quiet Hours

**File:** `supabase/functions/send-whatsapp/index.ts`

Replace `new Date().getHours()` (which uses UTC in Deno) with timezone-aware time formatting. The company timezone defaults to `Europe/Bucharest`.

```
// Convert current time to company timezone
const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Bucharest',
  hour: '2-digit', minute: '2-digit', hour12: false
});
const currentTime = formatter.format(new Date()); // "HH:MM"
```

---

## Technical Summary of All File Changes

| File | Fixes Applied |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | #1 (signature validation), #5 (tenant-scoped STOP) |
| `src/hooks/useWhatsApp.ts` | #2 (count queries for stats) |
| `supabase/functions/send-whatsapp/index.ts` | #4 (named vars), #7 (timezone) |
| `supabase/functions/whatsapp-retry/index.ts` | #4 (named vars) |
| `supabase/functions/whatsapp-broadcast/index.ts` | #4 (named vars) |
| `src/hooks/useCompany.ts` | #4 (named placeholders in seed templates) |
| `src/pages/WhatsAppTemplates.tsx` | #4 (update placeholder hint), #6 (delete confirmation) |

