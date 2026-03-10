

# Add "Half Shift" and "Extra Half Shift" Types

## Problem
When employees work only half a shift (intentionally scheduled), there's no way to distinguish this from a "partial shift" (someone who showed up but left early). Similarly, extra half-shifts have no dedicated type. This affects payroll accuracy — half-shift employees should get 50% pay by design, not be flagged as anomalies.

## Current State
- `shift_type` is a plain `string` column in the `shifts` table (no enum constraint) — so no DB migration needed
- Current values: `regular`, `extra`, `training`
- The type flows through: `useShifts.ts` → grid/dialogs → `usePayroll.ts` → `usePayrollBatchDetails.ts` → `payrollReportPdf.ts`

## Changes

### 1. Shift Creation Dialogs — Add new options
**Files:** `src/components/workforce/ShiftDialog.tsx`, `src/components/workforce/EnhancedShiftDialog.tsx`

- Expand the `shift_type` union type from `'regular' | 'training' | 'extra'` to include `'half' | 'extra_half'`
- Add two new `<SelectItem>` entries: "Half Shift" and "Extra Half Shift"

### 2. Type Definition
**File:** `src/hooks/useShifts.ts`

- Update the `Shift` interface `shift_type` to: `'regular' | 'training' | 'extra' | 'half' | 'extra_half' | null`

### 3. Scheduling Grid — Badges
**File:** `src/components/workforce/EnhancedShiftWeekView.tsx`

- Add badge rendering for `half` (e.g., blue/teal "½") and `extra_half` (orange "½ Extra")
- The existing `shiftTypeFilter` chips (All / Regular / Training) remain; half and extra_half shifts show under "All" and "Regular" filters

### 4. Payroll Logic — Recognize half shifts
**File:** `src/hooks/usePayroll.ts`

- Detect `shift_type === 'half'` or `shift_type === 'extra_half'` and set `is_extra_shift` accordingly for extra_half
- Add `is_half_shift` boolean to the `PayrollEntry` interface
- When calculating `dailyAmount` for half shifts, use `scheduledHours` as-is (the shift times already reflect the half duration) — no special multiplier needed since the manager sets the actual start/end times
- Track half shift dates separately for reporting

### 5. Payroll Batch Details — Track half shifts
**File:** `src/hooks/usePayrollBatchDetails.ts`

- Include `shift_type` in the shifts query (add to select)
- Pass `shift_type` through the employee shifts mapping
- Add `half_shift_count`, `half_shift_dates`, `extra_half_count`, `extra_half_dates` to `PayrollEmployeeDetail`
- Don't flag half shifts as "partial" — skip the partial detection when `shift_type` is `'half'` or `'extra_half'`

### 6. Payroll PDF Report
**File:** `src/lib/payrollReportPdf.ts`

- Add "Half Shifts" and "Extra Half" columns to the per-location table
- Add totals for half shifts in the Company-Wide Summary section

### 7. Payroll UI (Batches page)
**File:** `src/pages/workforce/PayrollBatches.tsx`

- Display half shift and extra half metrics in the batch detail view if applicable

## Key Design Decision
Half shifts are **not** the same as partial shifts. A partial shift means someone worked less than 75% of their scheduled time unexpectedly. A half shift is **intentionally scheduled** as half duration. The payroll logic must skip the partial-shift anomaly detection for shifts tagged as `half` or `extra_half`.

