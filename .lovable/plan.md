

# Fix All 4 Audit Issues — Multi-Week Employee View

## Issues to Fix

| # | Severity | Problem | Fix |
|---|----------|---------|-----|
| P1-a | P1 | Employee not pre-filled when creating shift from multi-week view | Add `defaultEmployeeId` prop to `EnhancedShiftDialog`; pass it from parent |
| P1-b | P1 | "All locations" query risks 1000-row truncation | No `company_id` filter when locationId is undefined |
| P2-a | P2 | `useTimeOffRequests` fetches entire company, filters client-side | Add optional `employeeId` param |
| P2-b | P2 | `rangeStart` doesn't sync when sheet reopens | Add `useEffect` to reset on open |

---

## Fix 1 — P1-a: Employee Pre-fill

### `EnhancedShiftDialog.tsx`
- Add `defaultEmployeeId?: string` to `EnhancedShiftDialogProps`
- In the existing reset `useEffect` (around line 283), when `!shift` (new shift mode) and `defaultEmployeeId` is provided, set `setSelectedEmployees([defaultEmployeeId])` instead of `[]`

### `EnhancedShiftWeekView.tsx`
- Add state: `defaultEmployeeForShift: string | undefined`
- In the multi-week `onCreateShift` callback (line 1648), also set `defaultEmployeeForShift` to `multiWeekEmployee.id`
- Pass `defaultEmployeeId={defaultEmployeeForShift}` to `EnhancedShiftDialog`
- Clear it when dialog closes (in `onOpenChange` at line 1538)

---

## Fix 2 — P1-b: Query Scope for "All Locations"

### `EmployeeMultiWeekView.tsx`
- When `locationId` is undefined or `"all"`, we still need all shifts for this employee across all locations. The current approach fetches everything and filters client-side, risking the 1000-row limit.
- **Fix**: Query `shift_assignments` directly filtered by `staff_id`, then join to `shifts`. This guarantees only this employee's shifts are returned regardless of location count.
- Alternative (simpler): Add `.limit(5000)` to the `useShifts` call specifically for the multi-week view, and add a secondary direct query:
  ```
  supabase.from("shift_assignments")
    .select("shift_id, shifts(*)")
    .eq("staff_id", employeeId)
    .eq("approval_status", "approved")
  ```
- **Chosen approach**: Add a dedicated `useEmployeeShifts(employeeId, startDate, endDate)` query inside `EmployeeMultiWeekView` that queries via `shift_assignments` → `shifts` join, bypassing the location-based query entirely. This is more efficient and eliminates the truncation risk.

### Implementation in `EmployeeMultiWeekView.tsx`
- Replace `useShifts` with an inline `useQuery` that:
  1. Queries `shift_assignments` filtered by `staff_id = employeeId` and `approval_status = approved`
  2. Joins `shifts(*, locations(name), employee_roles(color))` with date range filter and `cancelled_at IS NULL`
  3. Returns only this employee's shifts — no client-side filtering needed
- Remove the `employeeShifts` useMemo filter (no longer needed)

---

## Fix 3 — P2-a: Scoped Time-Off Query

### `useTimeOffRequests.ts`
- Add optional third parameter `employeeId?: string`
- When provided, add `.eq("employee_id", employeeId)` to query
- Add `employeeId` to `queryKey`: `["time-off-requests", startDate, endDate, employeeId]`

### `EmployeeMultiWeekView.tsx`
- Pass `employeeId` to `useTimeOffRequests(startDate, endDate, employeeId)`
- Remove the client-side `req.employee_id === employeeId` filter in `getTimeOffForDay`

---

## Fix 4 — P2-b: Sync rangeStart on Reopen

### `EmployeeMultiWeekView.tsx`
- Add `useEffect` that resets `rangeStart` to `startOfWeek(initialWeekStart, { weekStartsOn: 1 })` when `open` transitions to `true`
- Add `useEffect` import (already imported: `useState, useMemo` → add `useEffect`)

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/workforce/EnhancedShiftDialog.tsx` | Add `defaultEmployeeId` prop; pre-select employee in reset effect |
| `src/components/workforce/EnhancedShiftWeekView.tsx` | Track `defaultEmployeeForShift` state; pass to dialog; clear on close |
| `src/components/workforce/EmployeeMultiWeekView.tsx` | Replace `useShifts` with employee-scoped query; pass `employeeId` to time-off hook; add `useEffect` for rangeStart sync |
| `src/hooks/useTimeOffRequests.ts` | Add optional `employeeId` param with server-side filter |

