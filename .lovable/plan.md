

# WhatsApp Business Integration (Twilio) -- Full Implementation Plan

## Overview

Add WhatsApp messaging as an **optional, paid module** ("whatsapp_messaging") that companies can enable/disable via Module Management. Uses **Twilio** as the provider. Covers: database schema, edge functions, UI screens, opt-in flows, template management, delivery logs, quiet hours, throttling, escalation, and end-to-end testing.

---

## Phase 1: Database Foundation

### New Tables (via migration)

**1. `messaging_channels`** -- Per-company Twilio configuration
- `id` uuid PK
- `company_id` uuid FK companies (NOT NULL)
- `channel_type` text ('whatsapp') 
- `provider` text ('twilio')
- `phone_number_e164` text -- verified Twilio sending number
- `display_name` text
- `twilio_account_sid` text -- encrypted reference
- `twilio_auth_token_ref` text -- vault secret name
- `webhook_url` text -- auto-generated
- `webhook_secret` text -- for signature verification
- `status` text ('active', 'pending', 'disconnected')
- `quality_rating` text ('green', 'yellow', 'red')
- `last_health_check` timestamptz
- `created_at`, `updated_at` timestamptz
- RLS: company-scoped, only company_owner/company_admin can read/write

**2. `employee_messaging_preferences`** -- Per-employee opt-in + settings
- `id` uuid PK
- `employee_id` uuid FK employees (UNIQUE)
- `company_id` uuid FK companies
- `phone_e164` text -- validated E.164
- `whatsapp_opt_in` boolean DEFAULT false
- `opt_in_at` timestamptz
- `opt_in_source` text ('manual', 'onboarding', 'bulk')
- `opted_out_at` timestamptz
- `language` text DEFAULT 'en' ('en', 'ro')
- `quiet_hours_start` time (e.g. 22:00)
- `quiet_hours_end` time (e.g. 07:00)
- `channel_priority` text[] DEFAULT '{whatsapp,in_app}'
- `max_messages_per_day` int DEFAULT 20
- `created_at`, `updated_at` timestamptz
- RLS: company-scoped; employees can read/update their own row

**3. `wa_message_templates`** -- WhatsApp message templates
- `id` uuid PK
- `company_id` uuid FK companies
- `name` text -- template slug
- `language` text ('en', 'ro')
- `category` text ('utility', 'authentication', 'marketing')
- `header_type` text ('none', 'text', 'image')
- `header_content` text
- `body` text -- with {{1}}, {{2}} placeholders
- `footer` text
- `buttons` jsonb
- `variables_schema` jsonb -- describes expected variables
- `version` int DEFAULT 1
- `provider_template_id` text -- Twilio/Meta template SID
- `approval_status` text ('draft', 'pending', 'approved', 'rejected')
- `rejection_reason` text
- `created_by` uuid
- `created_at`, `updated_at` timestamptz
- RLS: company-scoped, admin+ can manage

**4. `notification_rules`** -- Event-to-channel routing
- `id` uuid PK
- `company_id` uuid FK companies
- `event_type` text ('shift_published', 'shift_changed', 'task_assigned', 'task_overdue', 'audit_failed', 'corrective_action', 'incident', 'points_earned', 'announcement')
- `channel` text ('whatsapp', 'in_app', 'email')
- `template_id` uuid FK wa_message_templates (nullable)
- `target_roles` text[] (['staff', 'shift_lead', 'manager'])
- `is_active` boolean DEFAULT true
- `throttle_max_per_day` int DEFAULT 20
- `escalation_after_minutes` int (nullable)
- `escalation_channel` text (nullable)
- `created_at` timestamptz
- RLS: company-scoped, admin+ can manage

**5. `outbound_messages`** -- Message queue + delivery tracking
- `id` uuid PK
- `company_id` uuid FK companies
- `employee_id` uuid FK employees
- `channel` text ('whatsapp')
- `template_id` uuid FK wa_message_templates (nullable)
- `rule_id` uuid FK notification_rules (nullable)
- `event_type` text
- `event_ref_id` uuid -- source shift/task/audit ID
- `recipient_phone_e164` text
- `variables` jsonb -- template variable values
- `idempotency_key` text UNIQUE -- hash(event_type + event_ref_id + employee_id + date)
- `status` text ('queued', 'sending', 'sent', 'delivered', 'read', 'failed')
- `provider_message_sid` text
- `error_code` text
- `error_message` text
- `retry_count` int DEFAULT 0
- `max_retries` int DEFAULT 3
- `next_retry_at` timestamptz
- `scheduled_for` timestamptz
- `sent_at` timestamptz
- `delivered_at` timestamptz
- `read_at` timestamptz
- `failed_at` timestamptz
- `created_at` timestamptz
- RLS: company-scoped, admin+ can read; system inserts

**6. `message_events`** -- Webhook status log (audit trail)
- `id` uuid PK
- `message_id` uuid FK outbound_messages
- `status` text
- `raw_provider_payload` jsonb
- `created_at` timestamptz DEFAULT now()
- RLS: company-scoped, admin+ can read

### Module Registration

Add `'whatsapp_messaging'` to the `MODULE_CONFIG` array in `ModuleManagement.tsx` and to pricing tiers in `pricingTiers.ts` (professional + enterprise only).

---

## Phase 2: Edge Functions (Backend)

### 1. `send-whatsapp` -- Core message sender
- Accepts: `{ company_id, employee_id, template_name, variables, event_type, event_ref_id }`
- Flow:
  1. Validate JWT + company access
  2. Look up `messaging_channels` for active WhatsApp config
  3. Look up `employee_messaging_preferences` -- check opt-in, quiet hours, daily throttle
  4. Look up `wa_message_templates` -- get approved template
  5. Check idempotency_key -- skip if duplicate
  6. Insert into `outbound_messages` with status='queued'
  7. Call Twilio API (`/Messages.json`) with template SID + variables
  8. Update status to 'sent' or 'failed'
  9. Return result

### 2. `whatsapp-webhook` -- Twilio status callbacks
- `verify_jwt = false` (public webhook)
- Validate Twilio signature (X-Twilio-Signature)
- Parse status updates (sent, delivered, read, failed, undelivered)
- Update `outbound_messages` status
- Insert into `message_events` for audit trail
- Handle opt-out ("STOP" keyword): set `opted_out_at` on employee_messaging_preferences

### 3. `whatsapp-retry` -- Retry failed messages (cron-triggered)
- Query `outbound_messages` where status='failed' AND retry_count < max_retries AND next_retry_at <= now()
- Re-attempt via Twilio API
- Increment retry_count, set next_retry_at with exponential backoff (1m, 5m, 30m)
- After max retries: create in-app notification as fallback

### 4. `whatsapp-broadcast` -- Bulk announcement sender
- Accepts: `{ company_id, template_id, variables, scope (location_ids, role, employee_ids), scheduled_for }`
- Validate permissions (admin+)
- Resolve recipients based on scope
- Insert batch into `outbound_messages`
- Process in batches (50/batch) to respect rate limits

### Config updates to `supabase/config.toml`:
```text
[functions.send-whatsapp]
verify_jwt = false

[functions.whatsapp-webhook]
verify_jwt = false

[functions.whatsapp-retry]
verify_jwt = false

[functions.whatsapp-broadcast]
verify_jwt = false
```

---

## Phase 3: Secrets Management

Two secrets needed per deployment (stored via Lovable secrets):
- `TWILIO_ACCOUNT_SID` -- Twilio Account SID
- `TWILIO_AUTH_TOKEN` -- Twilio Auth Token

These are requested from the user via the `add_secret` tool before implementation begins.

---

## Phase 4: UI Implementation

### 4.1 Module Management Update
Add WhatsApp Messaging to `MODULE_CONFIG` in `ModuleManagement.tsx`:
- Icon: `MessageSquare` from lucide
- Features: ['WhatsApp notifications', 'Message templates', 'Delivery tracking', 'Broadcast announcements']
- Add to pricing tiers: professional + enterprise

### 4.2 Company Settings -- New "Messaging" Tab
Add a new tab in `CompanySettings.tsx`:
- **WhatsApp Configuration Card**:
  - Twilio Account SID input
  - Twilio Auth Token input (masked)
  - Verified Phone Number (E.164 with country code picker)
  - Display Name
  - Connection status indicator (green/yellow/red)
  - "Test Connection" button -- sends a test message to admin's phone
  - Webhook URL (auto-generated, read-only, copy button)

### 4.3 Employee Profile -- WhatsApp Preferences
Add a "WhatsApp" section to the Employee Dialog/Profile:
- Phone number field (already exists, reuse `phone` from employees table)
- "Sync to WhatsApp" toggle -- copies phone to `employee_messaging_preferences` and normalizes to E.164
- Opt-in consent checkbox with timestamp display
- Language preference dropdown (EN/RO)
- Quiet hours: start/end time pickers
- Channel priority (drag to reorder or simple selects)

### 4.4 New Page: WhatsApp Templates (`/whatsapp-templates`)
- List view: template name, language, category, approval status badge, version
- Create/Edit dialog:
  - Name (slug), Language, Category selector
  - Body textarea with {{1}} placeholder helper buttons
  - Header (optional text/image)
  - Footer (optional)
  - Buttons config (quick reply / URL)
  - Variables schema editor (name + description per variable)
  - Preview panel showing rendered template
- "Submit for Approval" button (calls Twilio Content API)
- Version history

### 4.5 New Page: Notification Rules (`/whatsapp-rules`)
- Table of event types with columns:
  - Event Type | WhatsApp Enabled | Template | Target Roles | Throttle | Escalation
- Per-row edit: toggle channel, select template, configure roles, set throttle limit
- Escalation config: minutes before escalation, fallback channel

### 4.6 New Page: WhatsApp Broadcast (`/whatsapp-broadcast`)
- Scope selector: All employees / By location / By role / Custom selection
- Template selector (only approved templates)
- Variable mapping form (dynamic based on template variables_schema)
- Schedule: Send now or pick date/time
- Preview with recipient count
- Confirmation dialog before sending
- Progress indicator after send

### 4.7 New Page: WhatsApp Delivery Log (`/whatsapp-logs`)
- Filterable table:
  - Date range, employee search, event type, template, status filter
- Per-row: recipient (masked phone), template name, event source, status badge with timeline
- Expandable row: full status timeline, error details, raw payload
- Export to CSV button
- Aggregate stats cards: Total Sent, Delivered %, Read %, Failed %

### 4.8 Navigation Updates
- Add "WhatsApp" section under Settings or as sub-nav of Notifications
- Gate all WhatsApp pages behind `ModuleGate module="whatsapp_messaging"`
- Add nav items: Templates, Rules, Broadcast, Logs

---

## Phase 5: Event Integration

Hook into existing Dashspect events to trigger WhatsApp notifications:

1. **Shift Published/Changed**: After shift insert/update, check notification_rules for 'shift_published'/'shift_changed', call `send-whatsapp` for assigned employees
2. **Task Assigned/Overdue**: After task assignment or when task passes deadline, trigger notification
3. **Audit Failed**: When audit score falls below threshold, notify relevant managers
4. **Corrective Action Created**: Notify assigned employee
5. **Announcement**: Via broadcast UI
6. **Points Earned**: Gamification events trigger congratulation messages

Implementation approach: Add a `useWhatsAppNotifier` hook that checks if WhatsApp module is active and calls the `send-whatsapp` edge function. Integrate at the mutation level (onSuccess callbacks) for each event type.

---

## Phase 6: Phone Number Normalization

Create utility `src/lib/phoneUtils.ts`:
- `normalizeToE164(phone: string, defaultCountryCode: string = '+40'): string`
  - Strip spaces, dashes, parentheses
  - Handle Romanian formats: 07xx -> +407xx, 004x -> +4x
  - Validate with regex: `/^\+[1-9]\d{6,14}$/`
- `maskPhone(phone: string): string` -- show last 4 digits only
- `validatePhoneForWhatsApp(phone: string): { valid: boolean; normalized: string; error?: string }`

---

## Phase 7: Security and Compliance

1. **Webhook signature verification** in `whatsapp-webhook`:
   - Compute HMAC-SHA1 of request URL + body using Twilio Auth Token
   - Compare with `X-Twilio-Signature` header
   - Reject if mismatch

2. **Opt-out handling**:
   - Twilio forwards "STOP" messages via webhook
   - Edge function sets `opted_out_at` timestamp
   - All future sends check `opted_out_at IS NULL` before proceeding

3. **RLS policies**:
   - All tables use `company_id` scoping via `get_user_company_id(auth.uid())`
   - `employee_messaging_preferences`: employees can read/update own row
   - `outbound_messages`, `message_events`: admin+ read-only
   - `messaging_channels`, `wa_message_templates`, `notification_rules`: admin+ CRUD

4. **Audit trail**: Every message attempt logged in `outbound_messages` + `message_events`

---

## Phase 8: End-to-End Testing

### Edge Function Tests
1. **send-whatsapp**: 
   - Test with valid opt-in employee -> expect 'sent' status
   - Test with opted-out employee -> expect rejection
   - Test quiet hours blocking
   - Test throttle limit enforcement
   - Test idempotency (duplicate prevention)
   
2. **whatsapp-webhook**:
   - Test valid Twilio signature -> status update
   - Test invalid signature -> 403 rejection
   - Test STOP keyword -> opt-out recorded

3. **whatsapp-broadcast**:
   - Test scope resolution (location/role/custom)
   - Test batch processing

### UI Integration Tests
- Module enable/disable flow
- Channel configuration save/load
- Employee opt-in toggle
- Template CRUD
- Rules configuration
- Broadcast send flow
- Delivery log filtering and export

### Manual E2E Verification
- Configure Twilio test credentials
- Send a real WhatsApp message to a test number
- Verify delivery status webhook updates
- Verify opt-out flow with "STOP"
- Verify quiet hours blocking
- Verify throttle enforcement

---

## Technical Details

### File Changes Summary

**New Files:**
- `supabase/functions/send-whatsapp/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/whatsapp-retry/index.ts`
- `supabase/functions/whatsapp-broadcast/index.ts`
- `src/lib/phoneUtils.ts`
- `src/hooks/useWhatsApp.ts` -- queries for messaging config, templates, messages, preferences
- `src/hooks/useWhatsAppNotifier.ts` -- helper to trigger sends from UI events
- `src/pages/WhatsAppTemplates.tsx`
- `src/pages/WhatsAppRules.tsx`
- `src/pages/WhatsAppBroadcast.tsx`
- `src/pages/WhatsAppLogs.tsx`
- `src/components/settings/WhatsAppChannelSettings.tsx`
- `src/components/employee/WhatsAppPreferences.tsx`

**Modified Files:**
- `supabase/config.toml` -- add function configs
- `src/config/pricingTiers.ts` -- add 'whatsapp_messaging' to professional + enterprise tiers
- `src/components/settings/ModuleManagement.tsx` -- add WhatsApp module card
- `src/pages/CompanySettings.tsx` -- add Messaging tab
- `src/components/EmployeeDialog.tsx` -- add WhatsApp preferences section
- `src/hooks/useNavigation.ts` -- add WhatsApp nav items (gated by module)
- Route definitions -- add new pages

### Estimated Scope
- ~6 database tables with RLS
- 4 edge functions
- 4 new pages
- 3 new components
- 3 new hooks
- Modifications to ~6 existing files

