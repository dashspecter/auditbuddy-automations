

# Fix: Payroll PDF Report Missing Key Data (Partials, Late, Absences)

## The Problem

The **UI** and the **PDF report** use **two completely different data sources**:

| Feature | UI (Payroll.tsx) | PDF (PayrollBatches.tsx) |
|---|---|---|
| Data hook | `usePayrollSummary` | `usePayrollBatchDetails` |
| Partial shifts | Yes (actual < 75% scheduled) | No |
| Late count/minutes | Yes | Only in anomaly appendix |
| Absent days | Yes (from workforce_exceptions) | No column (only anomaly text) |
| Extra shifts | Yes (vs expected weekly) | No (only unscheduled attendance) |

This is why Serdar shows "3 worked + 1 partial" in the UI but "4 worked, 4 confirmed" in the PDF — the PDF hook counts a partial shift as a regular worked day.

## The Fix

**Unify the PDF to use the same data model as the UI.** Two approaches — I recommend Option A:

### Option A: Add missing fields to `usePayrollBatchDetails` and update the PDF template

1. **`usePayrollBatchDetails.ts`** — Add partial shift detection (same 75% threshold logic from `usePayroll.ts`), late count/minutes tracking, and properly separate absent days as a column.

2. **`payrollReportPdf.ts`** — Add columns for:
   - Partial Shifts (count + dates)
   - Absent Days (count + dates with reason codes)  
   - Late (count + total minutes)
   - Rename "Days Worked" to clarify it excludes partials, or show "3 + 1 partial"

3. **Anomalies appendix** — Keep it but also show absences with reason codes in the main table.

### Changes

| File | Change |
|---|---|
| `src/hooks/usePayrollBatchDetails.ts` | Add `partial_count`, `partial_dates`, `late_count`, `total_late_minutes`, `late_dates` fields; implement 75% threshold logic for partials; track late arrivals from attendance logs |
| `src/lib/payrollReportPdf.ts` | Add Partial, Absent, Late columns to the per-location table; update subtotals row; adjust column widths |

### Data alignment details

**Partial shift detection** (from `usePayroll.ts` logic):
```
actualHours < scheduledHours * 0.75 → partial
```

**Late tracking**: Already available in attendance logs (`is_late`, `late_minutes`) — just needs to be aggregated.

**Absent days**: Already fetched from `workforce_exceptions` in the hook — just needs a dedicated column in the PDF instead of being buried in the anomalies appendix.

This ensures the PDF matches what managers see on screen — no more discrepancies.

