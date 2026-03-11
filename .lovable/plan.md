

# City Hall Internal Operations — Final Implementation Plan

## Scope
Add "Government / Public Administration" as an industry with terminology overrides, a multi-step approval engine, and an executive dashboard. **Zero changes to existing logic** — everything is additive, gated by industry/module, and RLS-isolated per company.

---

## Phase 1: Foundation (Industry + Terminology)

### 1A. Database: Add Government Industry + Module Links
**Migration 1** — schema only:
- Create `company_label_overrides` table: `id (uuid PK)`, `company_id (uuid FK → companies, NOT NULL)`, `label_key (text NOT NULL)`, `custom_value (text NOT NULL)`, unique constraint on `(company_id, label_key)`
- RLS: SELECT for authenticated users where `company_id = get_user_company_id(auth.uid())`, INSERT/UPDATE/DELETE for owner/admin only

**Data insert** — using insert tool:
- Insert `Government / Public Administration` into `industries` (slug: `government`)
- Insert `module_industries` rows linking all 18 existing module IDs to the new government industry ID (so all modules appear during onboarding)

### 1B. Seed Label Overrides on Onboarding
**Migration 2** — update `create_company_onboarding` RPC:
- After company creation, check if selected industry slug = `government`
- If yes, auto-insert default label overrides: `company` → `Institution`, `employees` → `Civil Servants`, `locations` → `Departments`, `audits` → `Inspections`, `manager` → `Department Head`, `owner` → `Mayor / Secretary General`, `shifts` → `Duty Rosters`, `equipment` → `Municipal Assets`

### 1C. Frontend: useLabels Hook + UI Integration
**New file**: `src/hooks/useLabels.ts`
- Fetches `company_label_overrides` for current company via react-query
- Exports `useLabels()` → returns `label(key: string, fallback: string): string`
- Cached with long staleTime (labels rarely change)

**New file**: `src/pages/settings/TerminologySettings.tsx`
- Settings page for owner/admin to edit label overrides
- Simple key-value editor with defaults shown as placeholders

**Modified files** (additive only):
- `src/pages/CompanyOnboarding.tsx` — add `Landmark` icon to `industryIcons` map for `government` slug
- `src/components/layout/AppSidebar.tsx` — wrap nav item titles with `label()` for key items (Home, Workforce, Locations, Audits, Equipment)
- `src/components/dashboard/AdminDashboard.tsx` — use `label()` for header text
- `src/config/navigationConfig.ts` — add settings item for "Terminology" (owner-only)

---

## Phase 2: Multi-Step Approval Engine

### 2A. Database Tables
**Migration 3** — three new tables:

**`approval_workflows`**: `id`, `company_id (FK)`, `name`, `description`, `entity_type (text)`, `steps (jsonb)` — array of `{step_order, role, label}`, `is_active (bool default true)`, `created_at`, `updated_at`

**`approval_requests`**: `id`, `company_id (FK)`, `workflow_id (FK → approval_workflows)`, `entity_type`, `entity_id (uuid)`, `entity_title (text)`, `current_step (int default 1)`, `status (text default 'pending')` — pending/approved/rejected, `requested_by (uuid FK → auth.users)`, `created_at`, `updated_at`

**`approval_decisions`**: `id`, `request_id (FK → approval_requests)`, `step_order (int)`, `decided_by (uuid FK → auth.users)`, `decision (text)` — approved/rejected, `comment (text nullable)`, `decided_at (timestamptz default now())`

RLS on all three: strict `company_id = get_user_company_id(auth.uid())` scoping. Decisions insert-only for authenticated company members.

### 2B. Module Registration
- Add `government_ops` to `src/config/moduleRegistry.ts` — category `operations`, icon `Landmark`, display name "Government Operations"
- Add `government_ops` to all tiers in `src/config/pricingTiers.ts` `allowedModules`
- Insert corresponding row into `modules` table + link to government industry via `module_industries`

### 2C. Approval UI
**New files**:
- `src/pages/ApprovalQueue.tsx` — list of pending approval requests for current user's role, with approve/reject actions + comment
- `src/pages/settings/ApprovalWorkflows.tsx` — CRUD for workflows (name, entity type, steps builder)
- `src/hooks/useApprovals.ts` — queries for approval_requests, approval_workflows, mutations for approve/reject/create

**Modified files** (additive only):
- `src/config/navigationConfig.ts` — add "Approvals" nav item gated by `government_ops` module
- `src/App.tsx` — add routes for `/approvals` and `/settings/approval-workflows` wrapped in `<ModuleGate module="government_ops">`
- Settings nav: add "Approval Workflows" item (owner/admin only)

---

## Phase 3: Executive (Mayor) Dashboard

### 3A. New Components
**`src/components/dashboard/DepartmentHealthGrid.tsx`**:
- Queries locations (departments) for current company
- Aggregates per-department: latest audit score avg, task completion %, open corrective actions count, attendance rate
- Color-coded cards (green ≥80%, yellow ≥60%, red <60%)

**`src/components/dashboard/PendingApprovalsWidget.tsx`**:
- Shows count + list of items awaiting current user's approval decision
- Quick approve/reject inline

**`src/components/dashboard/ActivityFeedWidget.tsx`**:
- Queries `activity_logs` for last 20 entries scoped to company
- Renders timeline with actor, action, timestamp

**`src/components/dashboard/ExecutiveDashboard.tsx`**:
- Composes: DepartmentHealthGrid → CrossModuleStatsRow → PendingApprovalsWidget → TasksWidget + OpenCorrectiveActionsWidget → ActivityFeedWidget
- Reuses existing widgets, adds government-specific ones

### 3B. Conditional Dashboard Routing
**Modified**: `src/components/dashboard/AdminDashboard.tsx` — at the top, check if company industry slug is `government` AND user is owner/admin. If yes, render `<ExecutiveDashboard />` instead. A single early-return, no other logic touched.

To get industry slug: fetch from `industries` table via company's `industry_id` (add to `useCompany` return or create small helper hook `useCompanyIndustry`).

---

## Phase 4: Integration & Testing

- Verify onboarding flow: select Government industry → see all modules → create company → label overrides auto-seeded
- Verify sidebar shows overridden labels (Departments, Civil Servants, Inspections)
- Verify Terminology Settings page works for editing overrides
- Create an approval workflow → submit a task for approval → step through approve → verify status
- Verify Executive Dashboard renders for government company owner
- Verify non-government companies see zero changes (no new nav items, no label changes, standard dashboard)
- Verify RLS isolation: government company data invisible to other tenants

---

## Summary of Changes

| Type | Count | Details |
|---|---|---|
| New DB tables | 4 | `company_label_overrides`, `approval_workflows`, `approval_requests`, `approval_decisions` |
| Data inserts | 3 | Government industry row, module_industries links, government_ops module row |
| RPC update | 1 | `create_company_onboarding` — add label override seeding |
| New hooks | 3 | `useLabels`, `useApprovals`, `useCompanyIndustry` |
| New pages | 3 | ApprovalQueue, ApprovalWorkflows settings, TerminologySettings |
| New dashboard components | 4 | ExecutiveDashboard, DepartmentHealthGrid, PendingApprovalsWidget, ActivityFeedWidget |
| Modified files (additive) | 6 | moduleRegistry, pricingTiers, navigationConfig, App.tsx, CompanyOnboarding, AdminDashboard |
| Existing logic changed | 0 | Nothing removed or rewritten |

