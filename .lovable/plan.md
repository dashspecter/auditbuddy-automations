

# Phase 2: Scout Portal + Subdomain + Edge Functions

## Summary

Phase 2 builds on the Phase 1 foundation (10 scout tables, RLS, storage bucket, Core module pages) to deliver: the scout-facing portal at `scouts.dashspect.com`, invite-only scout registration, 4 edge functions, 2 new DB tables, and Core module enhancements. Mystery Shopper is not touched.

---

## What Gets Built

### A. Database Migration

1. **Add `'scout'` to `app_role` enum**
   - `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'scout'`

2. **`scout_disputes` table** — dispute per job
   - Fields: id, job_id, scout_id, status (open/under_review/closed), message, attachments (JSONB), resolution_notes, resolved_by, created_at, closed_at
   - RLS: scouts INSERT/SELECT own; org managers SELECT for company jobs; platform admin ALL

3. **`scout_audit_log` table** — action trail
   - Fields: id, actor_user_id, action, entity_type, entity_id, metadata (JSONB), created_at
   - RLS: platform admin ALL; org managers SELECT for own company entities; scouts SELECT own actions

4. **Add `packet_storage_path` column** to `scout_submissions`

5. **`register_scout` RPC** (SECURITY DEFINER) — called after signup with invite token:
   - Validates token (not expired, not used)
   - Marks invite as used
   - Creates `scouts` record (status='pending')
   - Creates `user_roles` record with role='scout'
   - Returns scout ID

### B. Subdomain Routing

- New hook: `src/hooks/useIsScoutsDomain.ts` — checks `window.location.hostname`
- `App.tsx` top-level branch: if scouts domain, render `ScoutPortalApp` with its own minimal router (no sidebar, no CompanyProvider)
- Scout portal has its own `AuthProvider` but skips `SidebarProvider` and `CompanyProvider`

### C. Scout Auth (invite-only)

- `ScoutLogin.tsx` — email/password login at `scouts.dashspect.com/login`
- `ScoutRegister.tsx` — invite-based registration at `scouts.dashspect.com/invite/:token`
  - Validates token client-side first, then calls `register_scout` RPC after Supabase auth signup
- `ScoutProtectedRoute.tsx` — checks user has `scout` role + scout status is `active`; shows "Pending Approval" if status='pending'

### D. Scout Portal Pages (10 pages)

All under `src/pages/scout-portal/`:

| Page | Route | Purpose |
|------|-------|---------|
| `ScoutPortalLayout.tsx` | wrapper | Minimal header + bottom nav, no sidebar |
| `ScoutLogin.tsx` | `/login` | Login |
| `ScoutRegister.tsx` | `/invite/:token` | Invite registration |
| `ScoutOnboarding.tsx` | `/onboarding` | Profile setup: city, zones, transport, terms |
| `ScoutHome.tsx` | `/` | Job feed: Available / My Jobs / History tabs |
| `ScoutJobDetail.tsx` | `/jobs/:id` | Pre-accept job view |
| `ScoutActiveJob.tsx` | `/jobs/:id/execute` | Guided checklist stepper + evidence capture |
| `ScoutSubmitReview.tsx` | `/jobs/:id/submit` | Completeness check + final review before submit |
| `ScoutJobResult.tsx` | `/jobs/:id/result` | Approval/rejection with per-step reasons |
| `ScoutEarnings.tsx` | `/earnings` | Payout ledger |
| `ScoutProfile.tsx` | `/profile` | Settings + availability |

### E. Edge Functions (4 new)

1. **`scout-signed-upload`** — issues signed upload URL for `scout-evidence` bucket
   - Validates: caller is assigned scout, job is accepted/in_progress
   - Returns signed URL + storage path
   - Logs in `scout_audit_log`

2. **`scout-signed-view`** — issues signed view URL (10-min expiry)
   - Validates: caller is assigned scout OR org manager for company
   - Logs view action

3. **`scout-job-accept`** — race-safe job acceptance
   - Uses `UPDATE ... WHERE status='posted' AND assigned_scout_id IS NULL` with returning
   - Sets assigned_scout_id, status='accepted', accepted_at

4. **`generate-evidence-packet`** — PDF generation
   - Cover page: org, location, job title, timestamps, scout anonymized ID
   - Steps + answers + media thumbnails
   - Stores PDF in `scout-evidence` bucket
   - Updates `scout_submissions.packet_storage_path`

### F. Scout Portal Hooks (6 new)

| Hook | Purpose |
|------|---------|
| `useIsScoutsDomain.ts` | Hostname detection |
| `useScoutAuth.ts` | Scout auth state + role check |
| `useScoutProfile.ts` | Scout profile CRUD |
| `useScoutJobFeed.ts` | Available/assigned/history jobs queries |
| `useScoutEvidence.ts` | Signed URL helpers (upload + view) |
| `useScoutDisputes.ts` | Dispute CRUD |

### G. Dashspect Core Enhancements (3 new pages + nav updates)

| Page | Route | Purpose |
|------|-------|---------|
| `ScoutsJobDetail.tsx` | `/scouts/jobs/:id` | Full job detail with timeline, media viewer via signed URLs |
| `ScoutsPayouts.tsx` | `/scouts/payouts` | Payout management (mark paid) |
| `ScoutsRoster.tsx` | `/scouts/roster` | View scouts who worked on org's jobs (scoped) |

Navigation update: add Payouts and Roster sub-items to scouts nav in `src/config/navigation.ts`.

---

## Technical Details

### Files to Create (~25 new files)

```text
src/hooks/useIsScoutsDomain.ts
src/hooks/useScoutAuth.ts
src/hooks/useScoutProfile.ts
src/hooks/useScoutJobFeed.ts
src/hooks/useScoutEvidence.ts
src/hooks/useScoutDisputes.ts
src/pages/scout-portal/ScoutPortalLayout.tsx
src/pages/scout-portal/ScoutLogin.tsx
src/pages/scout-portal/ScoutRegister.tsx
src/pages/scout-portal/ScoutOnboarding.tsx
src/pages/scout-portal/ScoutHome.tsx
src/pages/scout-portal/ScoutJobDetail.tsx
src/pages/scout-portal/ScoutActiveJob.tsx
src/pages/scout-portal/ScoutSubmitReview.tsx
src/pages/scout-portal/ScoutJobResult.tsx
src/pages/scout-portal/ScoutEarnings.tsx
src/pages/scout-portal/ScoutProfile.tsx
src/pages/scout-portal/ScoutProtectedRoute.tsx
src/pages/scouts/ScoutsJobDetail.tsx
src/pages/scouts/ScoutsPayouts.tsx
src/pages/scouts/ScoutsRoster.tsx
supabase/functions/scout-signed-upload/index.ts
supabase/functions/scout-signed-view/index.ts
supabase/functions/scout-job-accept/index.ts
supabase/functions/generate-evidence-packet/index.ts
```

### Files to Modify (additive only)

| File | Change |
|------|--------|
| `src/App.tsx` | Add scouts domain branch at top level + 3 new Core routes |
| `src/config/navigation.ts` | Add Payouts + Roster sub-items |
| `supabase/config.toml` | Add 4 edge function configs (verify_jwt = false) |

### What is NOT Changed

- Mystery Shopper (all `mystery_shopper_*` tables, routes, pages) — untouched
- Existing auth flows — untouched
- Phase 1 scout tables / RLS — untouched (only new tables + columns added)
- Existing navigation order — only sub-items appended

### Implementation Batches

**Batch 1 ✅ DONE:** Migration (app_role, disputes, audit_log, register_scout RPC) + subdomain routing + scout auth pages

**Batch 2:** Scout portal pages (job feed, job detail, active job stepper, submit, result)

**Batch 3:** Edge functions (signed upload/view, job accept, evidence packet) + media integration in both portals

**Batch 4:** Core enhancements (job detail, payouts, roster) + scout earnings + profile

### DNS Setup (manual step)

1. Add A record: `scouts.dashspect.com` → `185.158.133.1` at your domain registrar
2. Add `scouts.dashspect.com` in Lovable project settings → Domains
3. Wait for SSL provisioning

