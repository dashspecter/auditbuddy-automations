

# Template Install Creates Empty Template — Root Cause & Fix

## Root Cause

Same pattern as the evidence review bug: **RLS policy mismatch between company roles and platform roles**.

The install flow in `useInstallMarketplaceTemplate` does 3 things:
1. Creates `audit_templates` row — **succeeds** (its RLS checks `company_users` membership)
2. Creates `audit_sections` rows — **silently fails** (RLS requires platform `manager`/`admin` role via `has_role()`)
3. Creates `audit_fields` rows — **silently fails** (same RLS issue)

**User daniel.proper25@gmail.com** has:
- `company_role = company_owner` (in `company_users`)
- No platform role in `user_roles` table

The `audit_sections` and `audit_fields` INSERT policies only check `has_role(auth.uid(), 'manager'::app_role)` or `has_role(auth.uid(), 'admin'::app_role)`, which queries `user_roles` — a table where Daniel has no entries.

Result: template shell is created, but sections and fields are silently dropped. The code has `continue` on section errors, so it doesn't even throw.

## Fix (2 changes)

### 1. Update RLS policies for `audit_sections` and `audit_fields`

Add company-role-based access to the "Managers can manage sections/fields" policies, similar to the evidence packets fix:

```sql
-- audit_sections: allow company owners/admins/managers to manage
DROP POLICY "Managers can manage sections" ON public.audit_sections;
CREATE POLICY "Managers can manage sections" ON public.audit_sections
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM audit_templates t
      JOIN company_users cu ON cu.company_id = t.company_id
      WHERE t.id = audit_sections.template_id
        AND cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
    )
  )
  WITH CHECK (/* same condition */);

-- Same pattern for audit_fields (joining through audit_sections → audit_templates)
```

### 2. Add error handling in install flow

In `useInstallMarketplaceTemplate`, instead of `continue` on section errors, throw the error so the user gets feedback. Also verify sections were actually created before proceeding to fields.

### 3. Backfill: populate the empty installed template

Run a one-time fix for Daniel's HACCP template (`d671a1ba`) by re-inserting its sections and fields from the marketplace template content.

### Files to modify
- `src/hooks/useMarketplace.ts` — better error handling in install mutation
- Database migration — updated RLS policies for `audit_sections` and `audit_fields`

