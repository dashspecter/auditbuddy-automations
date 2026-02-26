

# Phase 1: Dashspect Scouts MVP — Core Module + Database Schema

## Overview

Phase 1 delivers: (A) the complete database schema with RLS for the Scouts system, (B) the Dashspect Core module (nav item + 5 tab pages for managers), and (C) the `scouts` module key registration. The Scout-facing portal (scouts.dashspect.com) is deferred to Phase 2.

This follows the platform's "safe layers" architecture: new tables, new pages, new nav items — zero modifications to existing features.

---

## What Gets Built

### A. Database Schema (1 migration)

**New tables (10):**

```text
scouts                    Scout profiles linked to auth.users
scout_invites             Invite tokens for scout registration
scout_templates           Job templates (checklist schema)
scout_template_steps      Steps within a template
scout_jobs                Job postings by org managers
scout_job_steps           Steps copied from template to job
scout_submissions         Scout submission per job
scout_step_answers        Answers per step
scout_media               Media uploads per step
scout_payouts             Payout ledger
```

**Key relationships:**
```text
scouts.user_id → auth.users(id)
scout_invites.created_by → auth.users(id)
scout_templates.company_id → companies(id)  (nullable for global)
scout_jobs.company_id → companies(id)
scout_jobs.location_id → locations(id)
scout_jobs.template_id → scout_templates(id)
scout_jobs.assigned_scout_id → scouts(id)
scout_submissions.job_id → scout_jobs(id)
scout_submissions.scout_id → scouts(id)
scout_step_answers.submission_id → scout_submissions(id)
scout_step_answers.step_id → scout_job_steps(id)
scout_media.submission_id → scout_submissions(id)
scout_media.step_id → scout_job_steps(id)
scout_payouts.scout_id → scouts(id)
scout_payouts.job_id → scout_jobs(id)
```

**Job status flow:** `draft → posted → accepted → in_progress → submitted → approved | rejected → paid | cancelled | expired`

**Submission status:** `pending_review → approved | rejected | resubmit_required`

**Scout status:** `pending → active → suspended`

### B. RLS Policies

| Table | Org managers (company-scoped) | Scouts (own data) | Platform admin |
|-------|-----|------|------|
| scouts | SELECT where scout worked their jobs | SELECT/UPDATE own record | ALL |
| scout_invites | INSERT/SELECT own company | -- | ALL |
| scout_templates | ALL own company | SELECT active templates | ALL |
| scout_template_steps | ALL via template company | SELECT via active template | ALL |
| scout_jobs | ALL own company | SELECT posted OR assigned | ALL |
| scout_job_steps | ALL via job company | SELECT via assigned job | ALL |
| scout_submissions | SELECT own company jobs | INSERT/SELECT own | ALL |
| scout_step_answers | SELECT own company | INSERT/SELECT own submission | ALL |
| scout_media | SELECT own company | INSERT/SELECT own submission | ALL |
| scout_payouts | SELECT/UPDATE own company | SELECT own | ALL |

**Storage bucket:** `scout-evidence` (PRIVATE)
- Path: `{company_id}/{job_id}/{submission_id}/{media_id}.ext`
- INSERT: authenticated + company-scoped via job ownership
- SELECT: signed URLs only, scoped to company or scout's own submissions

### C. Module Registration

1. Add `'scouts'` to `company_modules_module_name_check` constraint
2. Add `'scouts'` to `allowedModules` in `professional` and `enterprise` tiers in `pricingTiers.ts`
3. Add navigation item in `navigation.ts`

### D. Dashspect Core Module Pages (5 new pages)

**Navigation placement:** Top-level nav item "Scouts" with icon `UserSearch` (from lucide), positioned after "Corrective Actions" (item 16 in the hierarchy).

Sub-items:
1. **Overview** `/scouts` — KPIs dashboard (pending reviews, completion rate, jobs posted)
2. **Jobs** `/scouts/jobs` — List/filter/create jobs
3. **Create Job** `/scouts/jobs/new` — Template-based job creation form
4. **Review Queue** `/scouts/review` — Submitted jobs for step-by-step review
5. **Templates** `/scouts/templates` — Manage job templates with step schemas

All routes use `<ManagerRoute requiredPermission="manage_audits">` + `<ModuleGate module="scouts">`.

### E. 3 Seed Templates (via edge function or insert)

1. Cleanliness Check (15 min, 8 steps)
2. Closing Reset Proof (30 min, 12 steps)
3. Stock Snapshot (15 min, 6 steps)

---

## Technical Details

### Migration SQL structure

```sql
-- 1. Add 'scouts' to company_modules CHECK constraint
ALTER TABLE public.company_modules DROP CONSTRAINT company_modules_module_name_check;
ALTER TABLE public.company_modules ADD CONSTRAINT company_modules_module_name_check
  CHECK (module_name = ANY (ARRAY[
    'location_audits', 'staff_performance', 'equipment_management',
    'notifications', 'reports', 'workforce', 'documents',
    'inventory', 'insights', 'integrations', 'wastage',
    'qr_forms', 'whatsapp_messaging', 'payroll', 'cmms',
    'corrective_actions', 'operations', 'scouts'
  ]));

-- 2. scouts table
CREATE TABLE public.scouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  zones TEXT[] DEFAULT '{}',
  transport TEXT CHECK (transport IN ('walk','bike','car','public_transport')),
  rating NUMERIC(3,2) DEFAULT 0,
  completed_jobs_count INT DEFAULT 0,
  reliability_score NUMERIC(5,2) DEFAULT 100,
  terms_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. scout_invites
CREATE TABLE public.scout_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. scout_templates
CREATE TABLE public.scout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  estimated_duration_minutes INT NOT NULL DEFAULT 15,
  guidance_text TEXT,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. scout_template_steps
CREATE TABLE public.scout_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.scout_templates(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  prompt TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'photo' CHECK (step_type IN ('yes_no','text','number','photo','video','checklist')),
  is_required BOOLEAN DEFAULT true,
  min_photos INT DEFAULT 0,
  min_videos INT DEFAULT 0,
  guidance_text TEXT,
  validation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. scout_jobs
CREATE TABLE public.scout_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.scout_templates(id),
  template_version INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','accepted','in_progress','submitted','approved','rejected','paid','cancelled','expired')),
  payout_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RON',
  time_window_start TIMESTAMPTZ,
  time_window_end TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  assigned_scout_id UUID REFERENCES public.scouts(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  reviewer_user_id UUID REFERENCES auth.users(id),
  notes_public TEXT,
  notes_internal TEXT,
  rejection_reasons JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. scout_job_steps (copied from template at job creation time)
CREATE TABLE public.scout_job_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.scout_jobs(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  prompt TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'photo',
  is_required BOOLEAN DEFAULT true,
  min_photos INT DEFAULT 0,
  min_videos INT DEFAULT 0,
  guidance_text TEXT,
  validation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. scout_submissions
CREATE TABLE public.scout_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.scout_jobs(id) ON DELETE CASCADE,
  scout_id UUID NOT NULL REFERENCES public.scouts(id),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected','resubmit_required')),
  overall_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewer_user_id UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, scout_id)
);

-- 9. scout_step_answers
CREATE TABLE public.scout_step_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.scout_submissions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.scout_job_steps(id),
  answer_bool BOOLEAN,
  answer_text TEXT,
  answer_number NUMERIC,
  step_status TEXT DEFAULT 'pending' CHECK (step_status IN ('pending','passed','failed')),
  reviewer_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. scout_media
CREATE TABLE public.scout_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.scout_submissions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.scout_job_steps(id),
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo','video')),
  mime_type TEXT,
  size_bytes BIGINT,
  captured_at TIMESTAMPTZ,
  geo_hash TEXT,
  exif_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. scout_payouts
CREATE TABLE public.scout_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL REFERENCES public.scouts(id),
  job_id UUID NOT NULL REFERENCES public.scout_jobs(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  method TEXT DEFAULT 'manual',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id)
);

-- Enable RLS on all tables
-- + CREATE POLICY statements for each table (detailed above)
-- + Indexes on foreign keys and status columns
-- + Storage bucket creation
```

### New files to create

| File | Purpose |
|------|---------|
| `src/pages/scouts/ScoutsOverview.tsx` | KPI dashboard |
| `src/pages/scouts/ScoutsJobs.tsx` | Jobs list with filters |
| `src/pages/scouts/ScoutsJobNew.tsx` | Create job from template |
| `src/pages/scouts/ScoutsJobDetail.tsx` | Job detail + review |
| `src/pages/scouts/ScoutsReview.tsx` | Review queue |
| `src/pages/scouts/ScoutsTemplates.tsx` | Template management |
| `src/pages/scouts/ScoutsTemplateEditor.tsx` | Template step editor |
| `src/hooks/useScoutJobs.ts` | CRUD hooks for jobs |
| `src/hooks/useScoutTemplates.ts` | CRUD hooks for templates |
| `src/hooks/useScoutSubmissions.ts` | Submission review hooks |

### Files to modify (additive only)

| File | Change |
|------|--------|
| `src/config/navigation.ts` | Add `scouts` nav item with sub-items |
| `src/config/pricingTiers.ts` | Add `'scouts'` to professional + enterprise `allowedModules` |
| `src/App.tsx` | Add 7 new routes under `<ManagerRoute>` + `<ModuleGate>` |
| `src/i18n/locales/en.json` | Add nav labels |
| `src/i18n/locales/ro.json` | Add nav labels |
| `supabase/config.toml` | No changes needed |

### What is NOT built in Phase 1

- scouts.dashspect.com portal (Phase 2)
- Scout registration/login flow (Phase 2)
- Scout mobile app views (Phase 2)
- Edge functions for signed upload/view URLs (Phase 2)
- Evidence Packet PDF generation for scouts (Phase 2)
- Notifications/events tracking (Phase 2)
- Disputes system (Phase 2)
- Geo-check / anti-fraud (Phase 2+)

### What is NOT changed

- Existing Mystery Shopper feature — untouched
- Existing Evidence OS — untouched (Scouts will integrate with it in Phase 2)
- Existing navigation order — Scouts is appended
- Existing auth flows — untouched
- Existing RLS policies — untouched

---

## Milestone Breakdown (within Phase 1)

1. **Migration** — Create all 11 tables + RLS + indexes + storage bucket + module key
2. **Navigation + Module gate** — Add nav item, pricing tiers, i18n labels
3. **Templates page** — Create/edit scout templates with step builder
4. **Jobs page** — Create jobs from templates, list/filter, status management
5. **Review Queue** — Step-by-step review with pass/fail per step
6. **Overview dashboard** — KPI cards pulling from scout_jobs aggregations

Each milestone is independently testable and shippable.

