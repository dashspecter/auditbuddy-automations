

# Bug: Staff Audit Template Dropdown Not Filtered by Checker Assignments

## Problem

You're right — there's an inconsistency. The **Location Audit** flow on mobile (`StaffLocationAudit.tsx`) correctly filters templates by checker assignments:

```text
1. Fetch all templates
2. Fetch audit_template_checkers for this user
3. If assignments exist → show only assigned templates
4. If no assignments → show all (backwards compatible)
```

But the **Employee Audit** flow on mobile (`StaffStaffAudit.tsx`) **skips step 2-4 entirely** — it shows ALL staff-type templates to everyone. That's why Iulian/Zack see every template in the dropdown in your screenshot.

## Fix

**File: `src/pages/staff/StaffStaffAudit.tsx`** (~lines 118-128)

Add the same checker-assignment filtering that already exists in `StaffLocationAudit.tsx`:

1. After fetching staff templates, query `audit_template_checkers` for the current user
2. If the user has assignments, filter the template list to only assigned ones
3. If no assignments exist, show all (backwards compatible fallback)

This is a ~10-line addition mirroring the existing pattern from the location audit flow. No database changes needed.

