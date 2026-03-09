

# Fix: Unscheduled Clock-In Exception Not Created + Surface in Manager Mobile View

## Root Cause

The `workforce_exceptions` INSERT at lines 588 and 615 in `StaffScanAttendance.tsx` uses a **direct table insert**. The RLS INSERT policy requires the user to exist in `company_users`, but staff employees only exist in the `employees` table — so the insert is **silently rejected by RLS**. No error is thrown, no exception is created.

A `create_workforce_exception` SECURITY DEFINER RPC already exists and is used elsewhere (e.g., `RecordAbsenceDialog.tsx`). It bypasses RLS correctly.

## Current State of Manager Surfaces

- **Web (desktop)**: `PendingApprovalsDialog.tsx` already has an "Exceptions" tab with approve/deny for workforce exceptions — this works once exceptions actually exist in the database.
- **Mobile**: `ManagerApprovalsSection.tsx` shows shift assignments, time-off requests, and shift swaps — but does NOT include workforce exceptions.

## Changes

### 1. StaffScanAttendance.tsx — Replace direct inserts with RPC + block on failure

Three locations need fixing:

| Lines | Context | Fix |
|-------|---------|-----|
| 588-599 | Unscheduled shift exception | Replace `.insert()` with `supabase.rpc('create_workforce_exception', {...})`. On error: delete the attendance record just created, show error toast, return early (block check-in). |
| 615-627 | Late start exception | Same RPC replacement. On error: show warning toast (attendance already valid, just exception failed). |
| 820-834 | Blocked dialog request | Same RPC replacement. On error: show error toast. |

The RPC signature (already exists):
```typescript
supabase.rpc('create_workforce_exception', {
  p_company_id, p_location_id, p_employee_id,
  p_exception_type, p_shift_date,
  p_attendance_id, p_shift_id, p_metadata
})
```

For the unscheduled case, if the RPC fails, we **rollback** by deleting the attendance log and blocking check-in (per user preference).

### 2. ManagerApprovalsSection.tsx — Add workforce exceptions subsection

Import `useWorkforceExceptions` and `useResolveWorkforceException` from `useScheduleGovernance`. Add a "Workforce Exceptions" subsection (similar to existing "Shift Swaps" section) showing pending exceptions with:
- Exception type label + icon
- Employee name, date, location
- Approve / Deny buttons using `resolveException.mutate()`

Include exception count in `totalPending` so the badge is accurate.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/staff/StaffScanAttendance.tsx` | Replace 3 direct inserts with `create_workforce_exception` RPC; block check-in on failure for unscheduled case |
| `src/components/staff/ManagerApprovalsSection.tsx` | Add workforce exceptions with approve/deny (mirrors desktop PendingApprovalsDialog) |

No database changes needed.

