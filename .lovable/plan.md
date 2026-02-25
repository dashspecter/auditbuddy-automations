

## Problem

`getOpenShiftsForDay` (line 285-291) filters only on `shift.is_open_shift === true` with no regard for whether the shift is fully staffed. So a shift tagged as "open" remains in the Open Shifts row forever, even after an employee is assigned and approved.

The correct behavior: once an open shift has all its slots filled (approved assignments >= required_staff), it should move to the per-location "All Shifts" row — just like a published assigned shift.

## Fix

**File: `src/components/workforce/EnhancedShiftWeekView.tsx`**

### 1. Update `getOpenShiftsForDay` (lines 285-291)
Add a check: only include the shift if it still has unfilled slots (approved assignment count < required_staff, defaulting to 1).

```typescript
const getOpenShiftsForDay = (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return shifts.filter(shift => {
    if (shift.shift_date !== dateStr || !shift.is_open_shift) return false;
    const approvedCount = shift.shift_assignments?.filter(
      (sa: any) => sa.approval_status === 'approved'
    ).length || 0;
    return approvedCount < (shift.required_staff || 1);
  });
};
```

### 2. Update `getShiftsForLocationAndDay` (around line 460)
Currently excludes all `is_open_shift` shifts. Update to include fully-staffed open shifts (so they appear in "All Shifts" once filled):

```typescript
const getShiftsForLocationAndDay = (locationId: string, date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return (shiftsByLocation[locationId] || []).filter(shift => {
    if (shift.shift_date !== dateStr || !shift.is_published) return false;
    if (!shift.is_open_shift) return true; // normal published shift
    // Open shift: only show here if fully staffed
    const approvedCount = shift.shift_assignments?.filter(
      (sa: any) => sa.approval_status === 'approved'
    ).length || 0;
    return approvedCount >= (shift.required_staff || 1);
  });
};
```

### Result
- **Open Shifts row**: Only shows open shifts that still need claims (unfilled slots)
- **All Shifts row**: Shows published assigned shifts + fully-staffed open shifts
- A shift naturally "graduates" from Open → All Shifts when its last slot is approved

