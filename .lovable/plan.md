

# Fix P0 + P2: Multi-Week Employee View — Final Fixes

## What's broken

**P0 — Edit shift sends incomplete data to dialog**: The query at line 60-67 of `EmployeeMultiWeekView.tsx` only selects `id, shift_date, start_time, end_time, role, notes, locations(name), employee_roles(color), cancelled_at`. When a user clicks an existing shift to edit, this incomplete object is passed to `EnhancedShiftDialog` which expects `location_id`, `required_count`, `is_open_shift`, `is_published`, `close_duty`, `break_duration_minutes`, `shift_type`, `status`, `breaks`, and `shift_assignments`. Missing fields default to empty/false, silently **corrupting shift data on save**.

**P2 — Dead `locationId` prop**: Accepted in the interface (line 22) but never used after the P1-b fix. Dead code.

## Fixes

### File 1: `src/components/workforce/EmployeeMultiWeekView.tsx`

**Expand query select** (lines 60-67) to include all fields `EnhancedShiftDialog` needs:

```typescript
.select(`
  shift_id,
  shifts!inner(
    id, shift_date, start_time, end_time, role, notes,
    location_id, required_count, is_open_shift, is_published,
    close_duty, break_duration_minutes, shift_type, status,
    breaks, cancelled_at,
    locations(name),
    employee_roles(color),
    shift_assignments(id, staff_id, approval_status)
  )
`)
```

**Remove dead `locationId`** from the interface (line 22) and destructuring (line 28-38).

### File 2: `src/components/workforce/EnhancedShiftWeekView.tsx`

Remove `locationId={selectedLocation}` from the `EmployeeMultiWeekView` JSX (line 1649).

## Verification

1. Open multi-week view → click existing shift → confirm dialog shows correct location, required count, shift type, assigned employees
2. Save without changes → confirm DB data unchanged (no corruption)
3. Click empty cell → confirm employee pre-selected, shift creates correctly
4. Navigate weeks, toggle 2W/4W — all functional

## Files Modified

| File | Change |
|------|--------|
| `src/components/workforce/EmployeeMultiWeekView.tsx` | Expand query select; remove dead `locationId` prop |
| `src/components/workforce/EnhancedShiftWeekView.tsx` | Remove `locationId` prop from JSX |

