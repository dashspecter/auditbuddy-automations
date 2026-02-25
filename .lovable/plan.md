

## Summarize Anomalies Page in Payroll PDF

### Problem
The Anomalies appendix currently lists one row per individual anomaly (e.g., "Auto-clocked out on 2026-01-26"), which becomes unreadably long with multiple employees and locations.

### Solution
Replace the flat list with a **summary table** -- one row per employee, grouping anomaly types into counts with date lists:

```text
┌──────────────┬────────────┬─────────────────────────────┬──────────────────────────────┬──────────────┐
│ Employee     │ Location   │ Auto Clock-Outs             │ Late Arrivals                │ Missing Days │
├──────────────┼────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ Ala Aldghrati│ Bab's Obor │ 5 (Jan 6, 8, 23, 24, 26)   │ 0                            │ 6 (Jan 1,    │
│              │            │                             │                              │ 5, 9, 10,    │
│              │            │                             │                              │ 13, 14, 15)  │
│ Bibek Thapa  │ Bab's Obor │ 1 (Jan 16)                  │ 2 (Jan 5, 12)               │ 0            │
└──────────────┴────────────┴─────────────────────────────┴──────────────────────────────┴──────────────┘
```

### Change

**File: `src/lib/payrollReportPdf.ts`** -- Anomalies appendix section (~lines 155-180)

- Instead of iterating `emp.anomalies` into individual rows, parse each anomaly string to categorize it (auto-clock-out / late / missing) and collect dates
- Build one summary row per employee with columns: Employee, Location, Auto Clock-Outs (count + dates), Late Arrivals (count + dates), Missing Days (count + dates)
- Use the existing `formatMissingCol` helper pattern for the "count (dates)" format
- Keep the same branded table styling

