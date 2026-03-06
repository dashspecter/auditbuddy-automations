

# Enhanced Company Detail + Company Impersonation for Platform Admins

## Current State

- **Company Detail page** (`/admin/companies/:id`): Shows basic stats (user count, audit count, scout jobs), module management, user limits, and last 5 audits. Very limited visibility into what a company has actually been doing.
- **No impersonation mechanism**: The `useCompany` hook derives company from the logged-in user's `company_users` record. There's no way to "view as" another company.
- **RLS blocks cross-company reads**: Tables like `employees`, `locations`, `tasks`, `audit_templates` use `company_id = get_user_company_id()` in their SELECT policies. Platform admins can read `companies` cross-tenant but not operational tables.
- **BenStone SRL onboarding**: Companies self-register through the auth flow and land in "pending" status. Once approved, they're active. You approved them (or auto-approve is on), so they got access.

## Plan: Two-Part Approach

### Part 1 — Enhanced Company Detail Page (Quick Wins)

Expand the existing `CompanyDetail.tsx` with a comprehensive activity snapshot via a SECURITY DEFINER RPC that bypasses tenant-scoped RLS.

**New database function** — `get_company_overview(target_company_id uuid)`:
- Validates caller is a platform admin
- Returns aggregated counts: employees, locations, departments, tasks (total + completed), audit templates, corrective actions, shifts created
- Returns last activity timestamp (most recent audit, task, or shift)
- Returns signup metadata: who created it, when, how many days active

**UI additions** to `CompanyDetail.tsx`:
- **Activity Overview card**: Locations, Employees, Departments, Tasks, Templates, CAs — all as stat tiles
- **Onboarding Progress section**: Shows what the company has set up (locations? employees? templates? first audit?) as a checklist
- **Last Active indicator**: "Last activity: 2 days ago" or "No activity yet"
- **Registration Info**: When account was created, owner details (already partially shown)

### Part 2 — "View as Company" Impersonation Mode

Allow platform admins to temporarily switch their company context to view any company's dashboard.

**Mechanism**:
1. Add an `impersonatedCompanyId` state to `CompanyContext` (stored in sessionStorage so it survives refresh but not new tabs)
2. When set, `useCompany` hook returns the impersonated company instead of the admin's own company
3. A persistent banner at the top shows "Viewing as: BenStone SRL" with an "Exit" button
4. All existing hooks (`useEmployees`, `useLocations`, `useTasks`, etc.) automatically work because they read from `CompanyContext`

**RLS consideration**: The tricky part — existing RLS uses `get_user_company_id(auth.uid())` which returns the admin's real company, not the impersonated one. Two approaches:

- **Option A — Update `get_user_company_id()` function**: Add a `user_impersonation` table or check. This is risky and touches security foundations.
- **Option B — Use SECURITY DEFINER RPCs for read-only access**: Create RPCs like `admin_get_company_employees(target_id)`, `admin_get_company_locations(target_id)`, etc. Safer but requires hooking into every data hook.

**Recommended**: Start with **Part 1** (the enhanced detail page with the RPC) as it's self-contained and immediately useful. Part 2 (impersonation) is a larger architectural change that we should plan separately once Part 1 is live.

## Files to Change

### Database
- New migration: Create `get_company_overview` SECURITY DEFINER function

### Frontend
- `src/pages/admin/CompanyDetail.tsx` — Add overview stats, onboarding checklist, last active indicator

## Scope for This Implementation

Implement **Part 1 only** — the enhanced Company Detail page with the overview RPC. This gives you immediate visibility into BenStone SRL's activity without the complexity of full impersonation. We can tackle impersonation as a separate follow-up.

