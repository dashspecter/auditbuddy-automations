

# Fix Setup Checklist Button Redirects

## Problem

The checklist buttons navigate to non-existent routes. The paths in the component don't match the actual routes in `App.tsx`:

| Checklist path | Actual route | 
|---|---|
| `/locations` | `/admin/locations` |
| `/company-settings` | `/settings/company` |
| `/employees` | `/workforce/staff` |
| `/audit-templates` | `/admin/templates` |
| `/audits` | `/audits` (correct) |

## Fix

**Single file change**: `src/components/dashboard/CompanySetupChecklist.tsx`

Update the `path` values in the `steps` array (lines 110-146):

1. `"/locations"` → `"/admin/locations"`
2. `"/company-settings"` → `"/settings/company"`
3. `"/employees"` → `"/workforce/staff"`
4. `"/audit-templates"` → `"/admin/templates"`
5. `"/audits"` stays as-is

