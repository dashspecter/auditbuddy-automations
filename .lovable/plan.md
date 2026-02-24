
## Fix: Allow Company Admins to Access Payroll Routes

### Problem
Doug is a **company_admin** and can see the Payroll menu item in the sidebar (because the nav config allows `['admin', 'hr']`). However, when he navigates to the payroll page, he is denied access because the route in `App.tsx` is wrapped in `<CompanyOwnerRoute>`, which only allows **company owners**.

This is a route guard mismatch -- the sidebar shows the item, but the page blocks access.

### Root Cause

In `src/App.tsx`, lines 353-354:

```text
<Route path="/workforce/payroll" element={<CompanyOwnerRoute>...} />
<Route path="/workforce/payroll-batches" element={<CompanyOwnerRoute>...} />
```

`CompanyOwnerRoute` restricts to owner only. It should use `ManagerRoute` (like other workforce routes) so that admins and HR can also access payroll.

### Fix

**File: `src/App.tsx`**

Change the two payroll routes from `CompanyOwnerRoute` to `ManagerRoute` with appropriate permission:

- Line 353: `/workforce/payroll` -- change from `<CompanyOwnerRoute>` to `<ManagerRoute requiredPermission="manage_employees">`
- Line 354: `/workforce/payroll-batches` -- change from `<CompanyOwnerRoute>` to `<ManagerRoute requiredPermission="manage_employees">`

This aligns with the sidebar navigation config which already allows `['admin', 'hr']` roles, and matches how other workforce sub-pages (attendance, time-off, warnings) are guarded.

### Impact
- Company admins (like Doug) and HR users will now be able to access Payroll pages
- Company owners retain full access (ManagerRoute allows owners through)
- No database changes needed
- No changes to other routes or components
