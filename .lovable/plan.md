

# Add Tooltips to Company Users Role Controls

## What and Why

The Company Settings → Users tab has a role dropdown (Owner/Admin/Member) and three checkboxes (Manager/HR/Checker) with no explanation of what they do. Adding info tooltips next to each will clarify their purpose for company owners.

## Changes

**Single file: `src/pages/CompanySettings.tsx`**

1. Import `InfoTooltip` from `@/components/correctiveActions/InfoTooltip`

2. Add tooltip next to the **Company Role** dropdown label area (above the select, around line 418-431). Add a small header row with "Company Role" + InfoTooltip explaining:
   - **Owner** — Full control over the company, can manage all settings, users, and data
   - **Admin** — Management access to company data (locations, staff, shifts, audits) but cannot change company settings or manage users
   - **Member** — Basic access, can view data assigned to them

3. Add tooltip next to each checkbox label (lines 443-479):
   - **Manager** checkbox tooltip: "Grants access to management features like creating shifts, assigning tasks, and viewing reports"
   - **HR** checkbox tooltip: "Grants access to HR features like Time Off, Payroll, and Payroll Batches"
   - **Checker** checkbox tooltip: "Grants access to perform audits and inspections"

4. Add a section label "Additional Permissions" with an InfoTooltip before the checkboxes row, explaining: "These are additional permission flags that can be combined with the company role above"

