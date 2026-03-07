

# Diagnosis: Unscheduled Clock-In Not Reflecting Across Platform

## Root Causes Found

There are **3 separate issues** causing the unscheduled clock-in to not appear correctly:

### Issue 1: StaffHome doesn't check for existing attendance logs (Employee View)
After an unscheduled clock-in, the employee returns to StaffHome. The page only checks `todayShift` (shift_assignments) to decide what to render. Since an unscheduled clock-in creates an `attendance_log` but NOT a shift assignment, `todayShift` remains `null`, so the page shows the "No shift today" card again with the Clock In button — ignoring the fact that the employee already clocked in.

**Fix**: In `StaffHome.tsx`, after loading employee data, also check for an open attendance log today. If one exists (and no `todayShift`), show a "You're Clocked In" state instead of the "No shift today" card. This mirrors what `ClockInOutButtons` already does internally.

### Issue 2: Kiosk only shows scheduled employees (Kiosk View)
In `KioskDashboard.tsx` line 222:
```typescript
const todaysTeam = employees.filter((e) => employeeShiftMap.has(e.id));
```
`employeeShiftMap` is built from `shift_assignments` for today's shifts. An unscheduled employee has no shift assignment, so they're excluded from `todaysTeam` entirely — their attendance log is never checked, and they don't appear in "Clocked In" count or team list.

**Fix**: After building `todaysTeam` from shifts, also check `attendanceMap` for any employees who are clocked in today but NOT in `todaysTeam`. Add them to the team list (possibly with an "unscheduled" indicator). This ensures the kiosk reflects reality.

### Issue 3: Manager Pending Approvals — depends on policy setting
The exception only appears in the manager's "Exceptions" tab if:
1. Governance is enabled (`isGovernanceEnabled` = true in `StaffScanAttendance.tsx`)
2. The policy is set to `exception_ticket` (not `allow`)

If the policy is `'allow'`, an attendance record is created but **no workforce_exception** is inserted (line 584 only fires for `exception_ticket`). So nothing shows in the manager's Pending Approvals > Exceptions tab. This is actually by design — `'allow'` means no approval needed. But the user may have expected `exception_ticket` behavior.

This is a **configuration issue**, not a code bug. However, we should verify the company's current setting.

---

## Proposed Changes

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `src/pages/staff/StaffHome.tsx` | Add attendance log check; show "Clocked In" state with Clock Out button when employee has open attendance but no shift | Additive — no existing behavior modified |
| 2 | `src/components/kiosk/KioskDashboard.tsx` | Include unscheduled-but-clocked-in employees in `todaysTeam` (or separate "Unscheduled" section) | Additive — extends team list |
| 3 | No code change needed | Verify company's `unscheduled_clock_in_policy` — if set to `'allow'`, no exception is created (by design). If manager approval is wanted, it must be `'exception_ticket'`. | Config check |

### StaffHome Fix Detail

Add a new state `openAttendanceLog` fetched alongside shift data. In the render:

```text
if (todayShift) → show shift card + ClockInOutButtons (existing)
else if (openAttendanceLog) → show "Clocked In" card with Clock Out button
else → show "No shift today" + conditional Clock In button (existing)
```

The "Clocked In" card will show:
- Check-in time
- Location name  
- Clock Out button (navigates to `/staff/scan-attendance`)

### Kiosk Fix Detail

After computing `todaysTeam` from shift assignments, scan `attendanceMap` for employee IDs not already in the team. For each, look up the employee in `employeeMap` and add them to the team (or a separate "unscheduled" group). This ensures:
- "Clocked In" count includes unscheduled employees
- Team list shows them (possibly with a badge like "Unscheduled")

### Files Changed

| File | Lines added (approx) |
|------|---------------------|
| `src/pages/staff/StaffHome.tsx` | ~30 |
| `src/components/kiosk/KioskDashboard.tsx` | ~15 |

No database changes. No other files modified.

