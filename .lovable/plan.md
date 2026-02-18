
# CAPA-lite: Corrective Action System

## Overview

The CAPA-lite system is a perfect architectural fit for this platform. The codebase uses a clean additive pattern — new Supabase tables, React Query hooks, and new page components — that we will follow exactly. The existing EvidenceOS (`EvidenceCaptureModal`, `EvidencePacketViewer`, `useEvidencePackets`) will be reused directly for proof capture on action items. The existing notifications system, SLA management page, and Operations section will be extended rather than replaced.

One important alignment: the spec uses `org_id` but the entire codebase uses `company_id`. We will use `company_id` throughout.

---

## Architecture Fit Assessment

The platform is well-suited for CAPA-lite:

- **EvidenceOS** is already pluggable via `subject_type` + `subject_id` — we add `corrective_action_item` as a new subject type.
- **Navigation** uses a declarative registry (`src/config/navigation.ts`) — we add one new top-level entry.
- **Hooks** follow a `useQuery`/`useMutation` pattern — we create a `useCorrectiveActions.ts` family.
- **Edge functions** follow the `process-recurring-*` pattern — we create `process-capa-sla` and `process-capa-rules` in the same style.
- **RLS** follows `company_id` scoping with `security definer` functions — we continue that pattern.
- **Audit trail** uses the `platform_audit_log` trigger system — our `corrective_action_events` table is an append-only equivalent.

---

## Phase Plan

The implementation is broken into 5 sequential phases:

```text
Phase 1: Database schema + RLS
Phase 2: React hooks (data layer)
Phase 3: Core UI — List + Detail pages
Phase 4: Audit integration touchpoint
Phase 5: Edge functions — auto-rules + SLA scheduler
```

---

## Phase 1 — Database Migration

### Tables

**`corrective_actions`** — The primary CA case container:

```sql
CREATE TABLE public.corrective_actions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES companies(id),
  location_id         uuid NOT NULL REFERENCES locations(id),
  source_type         text NOT NULL, -- 'audit_item_result' | 'incident' | 'asset_downtime' | 'manual'
  source_id           uuid NOT NULL,
  title               text NOT NULL,
  description         text,
  severity            text NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
  status              text NOT NULL DEFAULT 'open',
  owner_user_id       uuid,
  owner_role          text,
  due_at              timestamptz NOT NULL,
  requires_approval   boolean NOT NULL DEFAULT false,
  approval_role       text,
  approved_by         uuid,
  approved_at         timestamptz,
  closed_at           timestamptz,
  stop_the_line       boolean NOT NULL DEFAULT false,
  stop_released_by    uuid,
  stop_released_at    timestamptz,
  stop_release_reason text,
  created_by          uuid NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```

**`corrective_action_items`** — Individual tasks within a CA:

```sql
CREATE TABLE public.corrective_action_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             uuid NOT NULL,
  corrective_action_id   uuid NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
  title                  text NOT NULL,
  instructions           text,
  assignee_user_id       uuid,
  assignee_role          text,
  due_at                 timestamptz NOT NULL,
  status                 text NOT NULL DEFAULT 'open',
  evidence_required      boolean NOT NULL DEFAULT true,
  evidence_packet_id     uuid,
  completed_by           uuid,
  completed_at           timestamptz,
  verified_by            uuid,
  verified_at            timestamptz,
  verification_notes     text,
  created_at             timestamptz NOT NULL DEFAULT now()
);
```

**`corrective_action_events`** — Append-only audit trail (no UPDATE/DELETE allowed via RLS):

```sql
CREATE TABLE public.corrective_action_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL,
  corrective_action_id uuid NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
  actor_id             uuid NOT NULL,
  event_type           text NOT NULL,
  payload              jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);
```

**`corrective_action_rules`** — Auto-generation config stored as JSONB:

```sql
CREATE TABLE public.corrective_action_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL,
  name           text NOT NULL,
  enabled        boolean NOT NULL DEFAULT true,
  trigger_type   text NOT NULL, -- 'audit_fail' | 'incident_repeat' | 'asset_downtime_pattern'
  trigger_config jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz DEFAULT now()
);
```

**`location_risk_state`** — Stop-the-line state per location:

```sql
CREATE TABLE public.location_risk_state (
  company_id        uuid NOT NULL,
  location_id       uuid NOT NULL REFERENCES locations(id),
  is_restricted     boolean NOT NULL DEFAULT false,
  restricted_reason text,
  restricted_ca_id  uuid REFERENCES corrective_actions(id),
  updated_at        timestamptz DEFAULT now(),
  PRIMARY KEY (company_id, location_id)
);
```

### Indexes

- `corrective_actions(company_id, location_id, status)`
- `corrective_actions(company_id, due_at)`
- `corrective_actions(source_type, source_id)`
- `corrective_action_items(corrective_action_id, status)`
- `corrective_action_events(corrective_action_id, created_at)`

### `updated_at` Trigger

A standard trigger on `corrective_actions` to auto-update `updated_at` on every row change.

### RLS Policies

Following the exact `company_id` scoping pattern used throughout the codebase:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `corrective_actions` | Users in same company | Managers/Admins | Managers/Admins | BLOCKED — use `cancelled` status |
| `corrective_action_items` | Users in same company | Managers/Admins | Assigned user OR Manager | BLOCKED |
| `corrective_action_events` | Users in same company | Authenticated users in company | BLOCKED | BLOCKED |
| `corrective_action_rules` | Managers/Admins | Admins/Owners | Admins/Owners | Admins/Owners |
| `location_risk_state` | Users in same company | Managers/Admins | Managers/Admins only | BLOCKED |

The `corrective_action_events` table will have RLS policies that prohibit UPDATE and DELETE at the database level, making it a tamper-evident append-only log (same pattern as `evidence_events`).

### EvidenceOS Extension

Add `corrective_action_item` to the `EvidenceSubjectType` union in `src/hooks/useEvidencePackets.ts`.

---

## Phase 2 — React Hooks (`src/hooks/useCorrectiveActions.ts`)

A single hook file following the established `useQuery`/`useMutation` pattern:

- **`useCorrectiveActions(filters)`** — lists CAs with optional filters (location, status, severity, date range)
- **`useCorrectiveAction(id)`** — single CA with items, events, and related location risk state
- **`useCreateCorrectiveAction()`** — creates CA + optional bundle items + logs `created` event
- **`useUpdateCorrectiveActionStatus()`** — handles status transitions, logs events, sets `closed_at`/`approved_at`
- **`useCompleteActionItem()`** — marks item done (requires evidence packet ID if `evidence_required`)
- **`useVerifyActionItem()`** — manager verification with notes, logs `item_verified`/`item_rejected`
- **`useReleaseStopTheLine()`** — releases location restriction, logs `stop_released` with reason
- **`useCorrectiveActionRules()`** — CRUD for auto-generation rules
- **`useLocationRiskState(locationId)`** — fetches current restriction status for a location

---

## Phase 3 — UI Pages

### Page 1: `/corrective-actions` — List Page

**File:** `src/pages/correctiveActions/CorrectiveActionsList.tsx`

Layout mirrors `AuditsList.tsx`. Includes:

- **Header**: "Corrective Actions" title + "New CA" button
- **KPI cards**: Open / In Progress / Overdue / Closed This Month
- **Filter bar**: location selector, status dropdown, severity dropdown, date range
- **Table/card list** with columns: Title, Severity badge (color-coded), Status badge, Location, Owner, Due date, SLA progress bar
- **Stop-the-line banner**: If any location is restricted, a prominent red banner appears at the top with a link to the CA
- Clicking a row navigates to `/corrective-actions/:id`

**Severity badge colors:**
- Low → slate
- Medium → amber
- High → orange
- Critical → red (with pulsing animation)

### Page 2: `/corrective-actions/:id` — Detail Page

**File:** `src/pages/correctiveActions/CorrectiveActionDetail.tsx`

Sections:

1. **CA Header Card**: Title, severity badge, status badge, source link (e.g., "From Audit: Kitchen Check #42"), owner, due date, SLA countdown
2. **Stop-the-line alert panel** (if `stop_the_line = true`): Red banner with location name, reason, and "Release Stop-the-Line" button (restricted to managers/admins with a required reason input)
3. **Action Items list**: Each item shows:
   - Title, assignee, due date, status badge
   - Evidence indicator (camera icon, green if attached, amber if required but missing)
   - Actions: "Mark Done" (opens `EvidenceCaptureModal` if `evidence_required`), "Verify" / "Reject" (manager-only)
4. **Approval section** (if `requires_approval = true` and all items verified): "Request Closure Approval" button → "Approve & Close" button (restricted to `approval_role`)
5. **Event Timeline**: Chronological log of all `corrective_action_events` showing actor, event type, and payload — read-only, append-only display

### Page 3: `/corrective-actions/rules` — Rules Configuration

**File:** `src/pages/correctiveActions/CorrectiveActionRules.tsx`

Admin/Owner only. Allows creating and editing auto-generation rules with a JSON-based config editor plus a friendly form builder for the `trigger_config` fields (template picker, severity selector, due hours, bundle item templates).

### Navigation Integration

In `src/config/navigation.ts`, add a new top-level entry after Operations (position 15, before Integrations):

```typescript
{
  id: 'corrective-actions',
  titleKey: "nav.correctiveActions",
  url: "/corrective-actions",
  icon: ShieldAlert, // re-use existing import
  module: null,
  allowedRoles: ['admin', 'manager'],
  companyPermission: 'manage_audits',
  subItems: [
    { id: 'ca-list', titleKey: "nav.allCAs", url: "/corrective-actions" },
    { id: 'ca-rules', titleKey: "nav.caRules", url: "/corrective-actions/rules", allowedRoles: ['admin'] },
  ]
}
```

Add the translation keys to i18n files and register routes in `App.tsx`.

---

## Phase 4 — Audit Integration Touchpoint

The minimal, non-breaking integration into the existing audit flow:

### In `src/pages/audits/AuditReport.tsx` and `src/pages/AuditDetail.tsx`

For each field response where the response represents a failure (e.g., `response_value = 0`, `"no"`, `"fail"`), render a small inline button:

```
[⚠ Create Corrective Action]
```

Clicking opens a lightweight `CreateCADialog` (a new shared component) pre-populated with:
- `source_type = "audit_item_result"`
- `source_id = audit_field_response.id`
- `title` pre-filled from the field name
- Severity selector
- Due date picker

If a CA already exists for this `source_id`, the button changes to:
```
[View CA →]
```

This is additive — no existing audit code is modified, only new UI elements are added to the detail view.

### In `src/pages/audits/PerformAudit.tsx`

No changes needed here. CA creation happens post-audit in the detail/report views.

---

## Phase 5 — Edge Functions

### Function 1: `process-capa-rules`

**File:** `supabase/functions/process-capa-rules/index.ts`

Triggered when called (initially manually / from a future database trigger webhook). Accepts `{ trigger_type, context }` in the request body.

Logic flow:
1. Fetch all enabled rules for the company matching `trigger_type`
2. Evaluate `trigger_config` against the provided context (e.g., for `audit_fail`: check if `audit_template_id` matches and the field's response is a failure value)
3. Check for an existing open CA for the same `source_id` to avoid duplicates
4. If no existing CA → create a new CA with bundled items from `trigger_config.bundle`
5. If existing open CA and context indicates repeat → escalate severity (log `escalated` event)
6. Returns created/updated CA ID

This function is called client-side (via `supabase.functions.invoke`) after a failed audit field response is saved, and after the audit is completed if the score falls below a configured threshold.

### Function 2: `process-capa-sla`

**File:** `supabase/functions/process-capa-sla/index.ts`

Runs on a schedule (every 30 minutes via `pg_cron` + `pg_net`). Scans all open/in-progress CAs and:

1. Calculates SLA percentage consumed: `(now - created_at) / (due_at - created_at) * 100`
2. Checks `corrective_action_events` for existing escalation events on that CA to prevent duplicates
3. At 50%: logs `escalated` event with `{ level: "reminder" }`, creates in-app notification to owner
4. At 90%: logs `escalated` event with `{ level: "warning" }`, creates notification to escalation role
5. At 100%+ (overdue): logs `escalated` event with `{ level: "overdue" }`, creates notification to ops-level roles, marks CA with an overdue flag in payload
6. For critical CAs with `stop_the_line = true`: ensures `location_risk_state.is_restricted = true`

Notifications use the existing `notifications` table pattern (INSERT into `notifications` with `target_roles`).

---

## File Manifest

### New Files

```text
src/pages/correctiveActions/CorrectiveActionsList.tsx
src/pages/correctiveActions/CorrectiveActionDetail.tsx
src/pages/correctiveActions/CorrectiveActionRules.tsx
src/hooks/useCorrectiveActions.ts
src/components/correctiveActions/CreateCADialog.tsx
src/components/correctiveActions/CAStatusBadge.tsx
src/components/correctiveActions/CASeverityBadge.tsx
src/components/correctiveActions/StopTheLineBanner.tsx
src/components/correctiveActions/ActionItemCard.tsx
src/components/correctiveActions/EventTimeline.tsx
supabase/functions/process-capa-rules/index.ts
supabase/functions/process-capa-sla/index.ts
```

### Modified Files (additive changes only)

```text
src/App.tsx                               — add 3 new routes
src/config/navigation.ts                  — add CA nav entry + i18n keys
src/hooks/useEvidencePackets.ts           — add 'corrective_action_item' subject type
src/pages/AuditDetail.tsx                 — add "Create CA" inline button on failed items
supabase/config.toml                      — add verify_jwt = false for new functions
```

---

## Security Checklist

- All tables have `company_id` column and RLS policies scoping to the user's company
- `corrective_action_events` has BLOCK on UPDATE and DELETE at RLS level (tamper-evident)
- Stop-the-line release restricted to manager/admin roles via RLS on `location_risk_state`
- CA rule management restricted to company_admin/company_owner
- Edge functions use `SUPABASE_SERVICE_ROLE_KEY` for internal operations, validate JWT for inbound calls
- No cross-company data leakage: all queries filter by `company_id` derived from the authenticated user's `company_users` record

---

## What is NOT in Scope (Future Phases)

- Incident repeat detection (requires an `incidents` table — not present in codebase)
- Asset downtime pattern detection (CMMS work orders exist but pattern analysis deferred)
- Vendor portal link for external technicians
- Email notifications (in-app only for now, email can be layered via existing notification infrastructure)
- CMMS work order → CA integration (deferred to Phase 2)

These are explicitly excluded to keep Phase 1 non-breaking and deliverable.
