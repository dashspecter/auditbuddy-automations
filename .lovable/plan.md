

# Integrate Recorded Absences into Payroll Views

## Current Gap
Both payroll hooks (`usePayroll.ts` line 243 and `usePayrollBatchDetails.ts` line ~225) determine "missed" shifts purely by checking if an attendance log exists. They never query `workforce_exceptions`. So a manager-recorded absence (sick, excused, etc.) looks identical to an unexplained no-show in payroll.

## What Changes

### 1. `usePayroll.ts` — Staff Payroll Summary (line ~127-291)
- Query `workforce_exceptions` (type='absence') for the period alongside shifts and attendance
- Build a lookup: `Set<string>` keyed by `employeeId_shiftId`
- When a shift has no attendance AND has a recorded absence: mark it as `is_absent: true` with `absence_reason` instead of `is_missed: true`
- Add `is_absent` and `absence_reason` fields to `DailyPayrollEntry` interface
- In `usePayrollSummary` (line ~295+): aggregate `absent_days` separately from `missed_days`

### 2. `usePayrollBatchDetails.ts` — Batch Details (line ~39-230)
- Same pattern: query `workforce_exceptions` for the period
- When computing per-employee metrics, check if a missed shift has a recorded absence
- Add new fields to `PayrollEmployeeDetail`: `absent_days`, `absent_details: Array<{ date, reason_code }>`
- Reduce `missing_no_reason` count by subtracting recorded absences

### 3. `Payroll.tsx` — Staff Summary UI
- Show a new "Absent" column (or split "Missed" into "Absent" + "Missing") with appropriate styling
- In the expandable row detail, add an "Absences" section showing dates and reasons

### 4. `PayrollBatches.tsx` — Batch Details UI
- Add "Absent" column to the employee breakdown table
- Show absence reason on hover/expand

## No Schema Changes
We only read from `workforce_exceptions` — no new tables or columns needed.

## Files Modified
1. `src/hooks/usePayroll.ts` — query exceptions, split missed vs absent
2. `src/hooks/usePayrollBatchDetails.ts` — query exceptions, add absent_days/details
3. `src/pages/workforce/Payroll.tsx` — UI column for absences
4. `src/pages/workforce/PayrollBatches.tsx` — UI column for absences in batch details

## What We Don't Touch
- `RecordAbsenceDialog`, `useAbsences`, auth, navigation, routes — zero changes

