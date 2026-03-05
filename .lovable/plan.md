

# Deep Audit: Proper Pizza Account Readiness

## Findings

### Critical Issue: Missing `user_roles` Entry for Company Owner

The onboarding RPC (`create_company_onboarding`) creates the company, assigns `company_owner` in `company_users`, and sets up modules — but it **never inserts a row into `user_roles`**. This means `has_role(auth.uid(), 'admin')` returns `false` for Proper Pizza's owner.

**Impact**: The owner cannot perform core management operations because RLS policies block them. Affected tables:

| Table | Operations Blocked |
|---|---|
| `locations` | INSERT, DELETE, full management |
| `employees` | Full management (INSERT/UPDATE/DELETE) |
| `shifts` | Full management |
| `tasks` | Full management |
| `audit_templates` | Full management |
| `audit_sections` | Full management |
| `audit_fields` | Full management |
| `attendance_kiosks` | Full management |
| `corrective_actions` | Management |
| `training_sessions` | Management |

This explains why the dashboard shows 0s everywhere — the owner literally cannot create any data.

### Secondary Issue: Free Tier with No Trial

Proper Pizza is on `subscription_tier: free` with no `trial_ends_at`. Fresh Brunch is on `enterprise` tier. If the platform enforces tier-based module gating, Proper Pizza may hit limitations. This needs to be set to the appropriate tier.

### Data Isolation: Confirmed Clean

After dropping the leaking `Public can view locations/departments` policies, the database is clean:
- 0 locations, 0 departments, 0 employees, 0 shifts, 0 tasks, 0 CAs, 0 kiosks
- 1 audit template (HACCP Daily Temperature Log) — correctly scoped to Proper Pizza's `company_id`
- 1 company user (Daniel Popescu, company_owner)
- No cross-company data leaks detected

### Remaining `USING(true)` Policies (Acceptable)

- `equipment_documents`: Scoped via `equipment_id` FK → equipment table has company-scoped RLS
- `marketplace_categories`, `marketplace_ratings`, `module_industries`: Global/shared config data
- `role_permissions`: Global permission definitions (no `company_id` column)
- `vouchers`: Public voucher visibility (intentional)

None of these leak company-specific operational data.

## Fix Plan

### 1. Fix Onboarding RPC — Add `admin` Role Assignment

Update `create_company_onboarding` to insert the `admin` role in `user_roles` for the new owner. This ensures all `has_role('admin')` RLS policies work from day one.

```sql
-- Add to the onboarding function, after company_users INSERT:
INSERT INTO public.user_roles (user_id, role)
VALUES (v_user_id, 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### 2. Backfill Proper Pizza Owner (and other affected owners)

Four company owners are missing the `admin` role in `user_roles`. All need backfilling:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT cu.user_id, 'admin'
FROM company_users cu
WHERE cu.company_role = 'company_owner'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = cu.user_id AND ur.role = 'admin'
  );
```

### 3. Set Proper Subscription Tier

Update Proper Pizza to the correct subscription tier (enterprise with trial, or whichever tier the client should have). This ensures module access and feature gating work correctly.

### 4. Post-Fix Verification Checklist

After applying:
1. Proper Pizza owner can create a location
2. Proper Pizza owner can add an employee
3. Proper Pizza owner can create a shift
4. Proper Pizza owner can create a task
5. Proper Pizza owner can create/edit audit templates
6. Dashboard populates with created data
7. Fresh Brunch sees zero Proper Pizza data
8. Kiosks still work for Fresh Brunch

## Risk

Very low. Adding the missing `admin` role to `user_roles` for company owners restores the intended permission model. No existing data or policies are modified — we are filling a gap in the onboarding flow.

## Files Changed

- 1 database migration (backfill + fix onboarding RPC)
- 0 frontend code changes

