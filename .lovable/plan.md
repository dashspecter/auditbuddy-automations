# City Hall Internal Operations — Implementation Progress

## Phase 1: Foundation (Industry + Terminology) ✅ COMPLETE

### 1A. Database ✅
- Created `company_label_overrides` table with RLS (company-scoped SELECT for members, INSERT/UPDATE/DELETE for owner/admin)
- Inserted "Government / Public Administration" industry (slug: `government`, id: `1c24d70b-00b2-4fb8-8ef8-9392e94a67d2`)
- Linked all 18 modules to the government industry via `module_industries`

### 1B. Onboarding RPC ✅
- Updated `create_company_onboarding` to auto-seed 8 label overrides when industry slug = `government`
- Labels: company→Institution, employees→Civil Servants, locations→Departments, audits→Inspections, manager→Department Head, owner→Mayor/Secretary General, shifts→Duty Rosters, equipment→Municipal Assets

### 1C. Frontend ✅
- `src/hooks/useLabels.ts` — hook with `label(key, fallback)` function
- `src/hooks/useCompanyIndustry.ts` — fetches industry slug for current company
- `src/pages/settings/TerminologySettings.tsx` — settings page for editing label overrides
- Added `Landmark` icon for `government` in `CompanyOnboarding.tsx`
- Added `Languages` icon + "Terminology" settings nav item in `AppSidebar.tsx` and `navigationConfig.ts`
- Added `/settings/terminology` route in `App.tsx`

---

## Phase 2: Multi-Step Approval Engine — TODO

### 2A. Database Tables
- `approval_workflows`, `approval_requests`, `approval_decisions` with RLS

### 2B. Module Registration
- `government_ops` in moduleRegistry, pricingTiers, modules table

### 2C. Approval UI
- ApprovalQueue page, ApprovalWorkflows settings, useApprovals hook
- Nav items gated by `government_ops` module

---

## Phase 3: Executive (Mayor) Dashboard — TODO

### 3A. New Components
- DepartmentHealthGrid, PendingApprovalsWidget, ActivityFeedWidget, ExecutiveDashboard

### 3B. Conditional Dashboard Routing
- AdminDashboard renders ExecutiveDashboard for government companies

---

## Phase 4: Integration & Testing — TODO
