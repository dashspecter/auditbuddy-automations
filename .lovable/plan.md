

# Fix: Maintenance Data Leaking Across Companies + Missing Module Gate

## Confirmed Root Causes (verified against live DB & RLS)

### Problem 1: `equipment_interventions` RLS leak

The **"Admins and managers can manage interventions"** policy grants ALL access to anyone with `has_role('admin')`, `has_role('manager')`, `has_company_role('company_admin')`, or `has_company_role('company_owner')` — with **zero company scoping**. Since these are permissive policies (OR'd), Daniel from PROPER PIZZA matches `has_company_role('company_owner')` and sees all 11 interventions (all with `company_id = NULL`).

Additionally, the **"Users can view interventions in their company"** and **"Users can view their assigned interventions"** policies both fall back to `has_role('manager')` / `has_role('admin')` without company filtering.

**Data state**: All 11 `equipment_interventions` rows have `company_id = NULL`.

### Problem 2: `recurring_maintenance_schedules` has no `company_id` column at all

The table entirely lacks a `company_id` column. Its only RLS policy is role-based with no company scoping — same pattern as above.

### Problem 3: No module gating on `MaintenanceInterventions` widget

The component renders unconditionally on both Admin and Manager dashboards. PROPER PIZZA doesn't have the maintenance module active but still sees the widget.

## The Fix (single migration + 1 UI change)

### Part A: Fix `equipment_interventions` RLS

1. Backfill `company_id` from `created_by` user's company
2. Make `company_id` NOT NULL
3. Drop all 4 existing policies, replace with 2 company-scoped policies:
   - SELECT for authenticated: `company_id = get_user_company_id(auth.uid())`
   - ALL for managers: `company_id = get_user_company_id(auth.uid())` (role gating stays in UI)

### Part B: Fix `recurring_maintenance_schedules`

1. Add `company_id` column (UUID, FK to companies)
2. Backfill from equipment's company_id via join
3. Make NOT NULL
4. Drop both existing policies, replace with company-scoped ones

### Part C: Module gate the dashboard widget

In `MaintenanceInterventions.tsx`: wrap the component with a `hasModule('maintenance')` check from `useCompanyContext`. If the module isn't active, return `null` — the widget simply won't render.

Same check in both `ManagerDashboard.tsx` and `AdminDashboard.tsx` where `<MaintenanceInterventions />` is used.

## What stays unchanged

- Equipment table RLS (already properly company-scoped)
- Equipment maintenance events RLS (already scoped via equipment join)
- All desktop/mobile layouts
- Kiosk access patterns
- All other modules

