

## Early Departure with Reason — Full Plan

### Overview
Two connected features: (1) capture early departure reasons during staff checkout, and (2) surface them in the payroll data + PDF report.

---

### Part 1: Database — Add `early_departure_reason` column

**Migration SQL:**
```sql
ALTER TABLE attendance_logs ADD COLUMN early_departure_reason text;
```

Single nullable text column on `attendance_logs`. No RLS changes needed — existing policies already cover this table.

---

### Part 2: Staff Checkout — Early Departure Prompt

**File: `src/pages/staff/StaffScanAttendance.tsx`**

After the checkout update succeeds (around line 396), add logic to detect early departure and prompt the employee:

1. **Add state variables** for the early departure dialog:
   - `showEarlyDepartureDialog: boolean`
   - `earlyDepartureLogId: string | null`
   - `earlyDepartureReason: string`

2. **After successful checkout** (line ~396-420): Query the attendance log's linked shift to get `end_time`. Compare checkout time vs shift end time. If checkout is **≥30 minutes early**, set `showEarlyDepartureDialog = true` and store the `openLog.id`.

3. **Early Departure Dialog** — a new `Dialog` component rendered in the JSX:
   - Title: "Leaving early?"
   - Subtitle: "Let your manager know why (optional)"
   - Preset reason buttons: "Feeling sick", "Family emergency", "Manager sent home", "Personal reason"
   - Free-text textarea for custom reason
   - "Skip" and "Submit" buttons
   - On submit: `UPDATE attendance_logs SET early_departure_reason = ? WHERE id = ?`
   - On skip: close dialog, no update

4. The checkout is **already recorded** before the dialog appears — this is purely supplemental context.

---

### Part 3: Update `useAttendanceLogs` Hook

**File: `src/hooks/useAttendanceLogs.ts`**

- Add `early_departure_reason?: string` to the `AttendanceLog` interface (line ~30)

---

### Part 4: Payroll Batch Details — Track Early Departures

**File: `src/hooks/usePayrollBatchDetails.ts`**

1. **Add to `PayrollEmployeeDetail` interface** (after line 28):
   ```typescript
   early_departure_days: number;
   early_departure_details: Array<{ date: string; reason: string }>;
   ```

2. **Fetch `early_departure_reason`** in the attendance logs query (line 71) — add it to the select string.

3. **Compute early departure metrics** in the per-shift loop (around line 194-196): when an attendance log has `early_departure_reason` set, add it to `early_departure_details` array and increment counter.

4. **Include in the output** (line 267-285).

---

### Part 5: PDF Report — Add Early Departures Column

**File: `src/lib/payrollReportPdf.ts`**

1. **Company-Wide Summary** (line ~50-65): Add `Early Departures` row to summary table with total count.

2. **Per-Location Tables** (line ~104-117): Insert a new column between "Medical Days" and "Missing (no reason)":
   - Header: `Early\nDep.`
   - Cell value: `1 (Jan 8: sick)` — count with dates and reasons inline
   - Update subtotals row accordingly

3. **Column widths**: Adjust existing column widths slightly to accommodate the new column (11 columns total in landscape should fit with smaller font).

4. **Summary totals** reducer (line ~120-131): Add `earlyDep` accumulator.

---

### Files Changed Summary

| File | Change |
|------|--------|
| **Database migration** | `ALTER TABLE attendance_logs ADD COLUMN early_departure_reason text` |
| `src/pages/staff/StaffScanAttendance.tsx` | Add early departure detection + dialog after checkout |
| `src/hooks/useAttendanceLogs.ts` | Add `early_departure_reason` to interface |
| `src/hooks/usePayrollBatchDetails.ts` | Fetch + compute early departure metrics |
| `src/lib/payrollReportPdf.ts` | Add Early Dep. column to tables + summary |

