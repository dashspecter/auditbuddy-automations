

# Update CheckerAuditsCard: Add Audit Type Selection

## Change

Replace the single "Create Audit" button in `CheckerAuditsCard` with two distinct options — **Location Audit** and **Employee Audit** — matching the same pattern already used in `ManagerAuditsCard`.

## File: `src/components/staff/CheckerAuditsCard.tsx`

Replace the single `<Button>` (lines 157-161) with two clickable rows:
- **Location Audit** → navigates to `/staff/location-audit` (existing behavior)
- **Employee Audit** → navigates to `/staff/employee-audit`

Each row will use the same card-style layout as `ManagerAuditsCard` (MapPin icon for location, Users icon for employee), keeping it visually consistent across roles.

No database or permission changes needed — the checker role already has `create` access to `audits` in the permission matrix.

