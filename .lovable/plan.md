

# Fix: Cross-Location Employees Missing from Payroll & Reports

## Root Cause

Found a confirmed bug in **`usePayrollBatchDetails.ts`** (line 73):

```typescript
if (locationId) empQuery = empQuery.eq("location_id", locationId);
```

This filters employees by their **primary** `location_id`. An employee whose primary location is "Location A" but who has shifts assigned at "Location B" will be **completely excluded** from Location B's payroll batch details — showing 0 shifts, 0 hours, or not appearing at all.

The **Payroll page** (`usePayrollFromShifts`) works differently — it goes through shifts → shift_assignments → employees, so it should correctly pick up cross-location workers. However, the batch details page is the more commonly used reporting surface.

## Fix

**File: `src/hooks/usePayrollBatchDetails.ts`**

Instead of filtering employees by their primary `location_id`, the logic should:

1. **Filter shifts by location** (not employees) — add `location_id` filter to the shifts query (line 78-87)
2. **Derive the employee list from those shifts** — collect all `staff_id` values from shift_assignments at the target location, then fetch those employees regardless of their primary location
3. Keep the current behavior when no location filter is applied (show all employees)

This is the same pattern that `usePayrollFromShifts` already uses correctly.

### Specific Changes

```typescript
// Before (broken): filter employees by primary location
let empQuery = supabase.from("employees").select("...").eq("status", "active");
if (locationId) empQuery = empQuery.eq("location_id", locationId);

// After (fixed): filter shifts by location, derive employees from assignments
let shiftsQuery = supabase.from("shifts").select(`...`).gte(...).lte(...);
if (locationId) shiftsQuery = shiftsQuery.eq("location_id", locationId);
// Then collect unique staff_ids from shift_assignments
// Fetch employees by those IDs (no location_id filter)
```

This ensures that any employee assigned to a shift at Location B appears in Location B's payroll — regardless of their primary location setting.

