

## Payroll Summary PDF Report -- Per Location, Per Employee

### What You Have Today
The Payroll Batches page already computes all the right data per employee via `usePayrollBatchDetails`: days worked, confirmed days, extra schedule days, vacation, medical, missing/absent days, cross-location shifts, regular hours, overtime hours, and anomalies. But there's **no way to download this as a report** -- it only lives in the on-screen dialog.

### What We'll Build
A **"Download Payroll Report"** button inside the batch detail dialog that generates a branded PDF with:

1. **Cover / Header** -- Company name, period dates, generation date
2. **Company-Wide Summary** -- Total employees, total regular hours, total overtime, total vacation days, total medical days, total missing days
3. **Per-Location Sections** -- Employees grouped by their primary location, each section showing:
   - Location name as section header
   - Table with one row per employee containing all columns:

```text
┌──────────────┬────────┬───────────┬───────┬──────────┬─────────┬─────────┬───────────┬─────────┬──────────┐
│ Employee     │ Role   │ Days      │ Conf. │ Extra    │ Vacation│ Medical │ Missing   │ Reg.Hrs │ OT Hrs   │
│              │        │ Worked    │ Days  │ Schedule │ Days    │ Days    │ (no reason│         │          │
│              │        │           │       │ Days     │         │         │  + dates) │         │          │
├──────────────┼────────┼───────────┼───────┼──────────┼─────────┼─────────┼───────────┼─────────┼──────────┤
│ Bibek S.     │ Waiter │ 18        │ 18    │ 2        │ 0       │ 0       │ 1 (Mar 3) │ 144.0   │ 8.5      │
│ Doug M.      │ Chef   │ 20        │ 19    │ 0        │ 2       │ 1       │ 0         │ 160.0   │ 4.0      │
└──────────────┴────────┴───────────┴───────┴──────────┴─────────┴─────────┴───────────┴─────────┴──────────┘
```

4. **Cross-Location Work appendix** -- For employees who worked at other locations, a detail list showing date + location name
5. **Anomalies appendix** -- Late arrivals, auto-clock-outs, etc.

### Technical Plan

| File | Change |
|------|--------|
| `src/lib/payrollReportPdf.ts` | **New file** -- `generatePayrollReportPDF()` function using jsPDF + jspdf-autotable with the existing `pdfBranding` utilities. Takes the `PayrollEmployeeDetail[]` array + period info and produces the grouped-by-location PDF described above. |
| `src/pages/workforce/PayrollBatches.tsx` | Add a "Download Report" button in the batch detail dialog header that calls `generatePayrollReportPDF()` with the `enhancedDetails` data. |

### Technical Details

- **New file `src/lib/payrollReportPdf.ts`**:
  - Import `addBrandedHeader`, `addBrandedFooter`, `getBrandedTableStyles`, `addSectionTitle`, `BRAND_COLORS` from `./pdfBranding`
  - Group `PayrollEmployeeDetail[]` by `location_name`
  - Page 1: Summary cards (employee count, total hours, total OT, vacation, medical, missing)
  - Per-location tables with all 10 columns
  - Missing dates shown inline in the "Missing" column (e.g., "2 (Mar 3, Mar 7)")
  - Extra schedule dates shown inline similarly
  - Cross-location details as footnotes or a separate section at the end
  - Auto page-breaks handled by jspdf-autotable
  - Filename: `Payroll_Report_{period_start}_{period_end}.pdf`

- **Button in `PayrollBatches.tsx`**:
  - Added next to the dialog title or in the dialog footer
  - Disabled while `detailsLoading` or when `enhancedDetails` is empty
  - Calls `generatePayrollReportPDF({ employees: enhancedDetails, periodStart, periodEnd })`

### What the Report Gives You
Even without salary data in the platform, this report gives accounting/HR everything they need to calculate pay:
- Exact days worked and confirmed (for daily-rate contracts)
- Regular vs overtime hours (for hourly contracts)
- Vacation and medical days (for paid leave calculations)
- Missing days with dates (for deductions)
- Extra/unscheduled work days (for bonus pay)
- Cross-location work (for cost allocation between locations)

