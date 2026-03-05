

# Fix: Revert has_role() and Properly Scope All Unscoped Policies

## Root Cause

The `has_role()` enhancement made company owners pass the `manager` check. But ~30 policies use `has_role('manager')` or `has_role('admin')` **without company_id filtering**, meaning anyone passing that check sees data from ALL companies. Examples:

- `location_audits` SELECT: `has_role('manager')` → sees all audits across all companies
- `audit_templates` ALL: `has_role('manager')` → manages all templates
- `staff_audits` SELECT: `has_role('manager')` → sees all staff audits
- `profiles` SELECT: `has_role('manager')` → sees all profiles
- And ~25 more policies

## Fix Strategy (2 steps)

### Step 1: Revert `has_role()`

Restore original function — only checks `user_roles` table:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Step 2: Fix all unscoped operational policies

Replace every `has_role('manager')` / `has_role('admin')` policy that lacks a `company_id` filter with a properly scoped version. The pattern for each:

**Before (broken):**
```sql
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'))
```

**After (secure):**
```sql
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin')
    OR has_company_role(auth.uid(), 'company_owner')
    OR has_company_role(auth.uid(), 'company_admin')
  )
)
```

For tables without direct `company_id` (like `location_audits`), use EXISTS through the parent table (e.g., via `locations.company_id`).

### Complete list of policies to fix (grouped by table)

**Direct company_id tables:**
- `audit_templates` — "Managers can manage templates" (ALL)
- `locations` — "Admins and managers can delete" (DELETE)
- `manual_metrics` — view/update/delete (3 policies)
- `recurring_audit_schedules` — view/update/delete (3 policies)
- `notifications` — admin view/update/delete (3 policies)
- `employee_warning_views` — SELECT
- `equipment_documents` — "Admins and managers can manage" (ALL)
- `equipment_status_history` — "Admins and managers can view" (SELECT)
- `recurring_maintenance_schedules` — ALL + SELECT
- `notification_audit_logs` — 2 policies
- `notification_templates` — "Managers can view" (SELECT)

**Join-through-parent tables:**
- `location_audits` — manager/admin SELECT, UPDATE, DELETE (4 policies) → join through `locations`
- `staff_audits` — SELECT, UPDATE, DELETE (3 policies) → via `company_id` column or employees join
- `audit_sections` — "Admins can manage" (ALL) → join through `audit_templates`
- `audit_fields` — "Admins can manage" (ALL) → join through `audit_sections → audit_templates`
- `audit_field_responses` — UPDATE → join through `location_audits`
- `audit_section_responses` — UPDATE → join through `location_audits`
- `audit_photos` — view/delete (2 policies) → join through `location_audits`
- `audit_revisions` — SELECT → join through `location_audits`
- `audit_field_attachments` — view/delete (2 policies) → join through `location_audits`
- `audit_field_photos` — view/delete (2 policies) → join through `location_audits`
- `template_locations` — ALL + SELECT (2 policies) → join through templates or locations
- `test_assignments` — UPDATE, SELECT, ALL (3 policies) → via employees
- `test_questions` — ALL → via tests company_id
- `test_submissions` — UPDATE, SELECT, view (3 policies) → via employees
- `profiles` — "Managers can view all", "Admins can view all" (2 policies) → via company_users join

**Platform-only (keep as-is, admin only):**
- `modules`, `industries`, `module_industries`, `company_modules` — platform config
- `scout_*` (10 tables) — mystery shopper platform
- `user_roles` — platform role management
- `marketplace_*` — template marketplace
- `role_permissions` — platform permissions
- `activity_logs` — "Admins can view all" (platform admin feature)

### No frontend changes needed

The same components and hooks continue to work. Company owners/admins get access through the explicit `has_company_role()` checks added to each policy, properly scoped to their company.

