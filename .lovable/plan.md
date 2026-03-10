

# Show Audit Template Name on Staff Audit Detail Page

## Problem
The `staff_audits` table has a `template_id` column linking to the audit template, but the detail page (`StaffAuditDetail.tsx`) never joins or displays it. There's no way to see which audit template was used.

## Fix

**File: `src/pages/StaffAuditDetail.tsx`**

1. **Add template to the Supabase query** — include `audit_templates(name)` in the `.select()` join (line 22-26)
2. **Display the template name** in the header or Audit Information card — show it as the audit title (e.g., "Monthly Performance Review") alongside the employee name
3. Update the page title from generic "Employee Audit Details" to show the template name, e.g., `{audit.audit_templates?.name || "Employee Audit Details"}`
4. Add the template name as a row in the Audit Information card

No database changes needed — `template_id` and the `audit_templates` table already exist.

