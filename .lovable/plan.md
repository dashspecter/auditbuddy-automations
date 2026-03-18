

# Analysis: Partial Shifts, Missing Check-Outs & Late/Early Tracking

## Current State — What Already Works

| Feature | Status | Where |
|---------|--------|-------|
| **Partial shift detection** | ✅ Works | `usePayrollBatchDetails.ts` — flags when actual hours < 75% of scheduled |
| **Early departure reason capture** | ✅ Works | `StaffScanAttendance.tsx` — prompts reason if checkout > 30min before shift end |
| **Late arrival detection** | ✅ Works | `is_late` + `late_minutes` columns, shown in Attendance table + payroll report |
| **Auto clock-out** | ✅ Works | Edge function `auto-clockout` — clocks out N minutes after shift end, sets `auto_clocked_out = true` |
| **Payroll PDF anomalies** | ✅ Partial | Shows auto clock-outs, late arrivals, partial shifts as counts — but missing detail on hours short and reasons |

## What is Missing — The Gaps

### 1. Partial shift has no mandatory reason at checkout
The early departure reason dialog only triggers if checkout is > 30 minutes early. But partial shift detection (< 75% of scheduled) is calculated *after the fact* in payroll, not at checkout time. There is no enforcement linking them. If someone checks out 2 hours early on an 8-hour shift, the dialog fires, but if they check out 1.5 hours early on a 3-hour shift (still > 30 min threshold), it also fires. The issue: the 30-minute threshold is a fixed number, not tied to the percentage-based partial detection.

### 2. No "hours short" shown in reports
The payroll report shows "Partial Shifts: 2" as a count but does NOT show how many hours earlier the employee left compared to their scheduled shift. The anomaly string says `Partial shift on 2026-03-15 (5.2h / 8.0h)` internally, but the PDF anomalies table only shows the count, not the breakdown.

### 3. No flag for "shift without check-out"
When someone doesn't check out at all, the auto-clockout edge function eventually marks them `auto_clocked_out = true`. But there is:
- No alert/flag created specifically saying "Shift without check-out — to be verified"
- No distinction between "forgot to clock out" vs "actually left early without checking out"
- The auto-clockout sets `check_out_at` to shift-end + delay, which **hides** the real situation

### 4. No manager/admin manual checkout capability
There is no UI for a manager to manually enter a checkout time for an employee. The only checkout paths are: (a) employee scans QR, (b) auto-clockout edge function. If someone forgot to check out and actually left at 3pm, there's no way to correct it.

### 5. Late + early not correlated with partial shifts
The payroll detail shows late arrivals and early departures as separate sections. There is no logic connecting them: e.g., "Employee was 30min late AND left 1h early = partial shift with 1.5h shortage."

### 6. Early departure details missing hours in report
The `early_departure_details` array stores `{ date, reason }` but NOT how many hours/minutes early the person left. The PDF "Early Dep." column shows dates + reasons but not the time delta.

## Proposed Plan

### Fix 1: Smart early-departure threshold at checkout
In `StaffScanAttendance.tsx`, change the 30-minute fixed threshold to be percentage-based: if actual worked time would be < 75% of scheduled, make the reason dialog **mandatory** (no "Skip" button). For departures between 75%-100%, keep the current optional prompt.

### Fix 2: Calculate and store hours short
At checkout time (both QR scan and auto-clockout), calculate `hours_short = scheduled_hours - actual_hours` and store it in a new column `hours_short numeric` on `attendance_logs`. This makes reporting straightforward.

**DB migration**: Add `hours_short` column to `attendance_logs`.

### Fix 3: "Missing Check-Out" alert flag
Modify the `auto-clockout` edge function: before setting `auto_clocked_out`, also create an alert with source `missing_checkout` and severity `warning`, message: "Employee X did not check out for their shift at Location Y — to be verified." This gives managers a visible flag in the alerts system.

### Fix 4: Manager manual checkout UI
Add a row action to the Attendance table (`Attendance.tsx`) for logs where `check_out_at` is null or `auto_clocked_out = true`. The action opens a dialog where a manager can:
- Enter the actual checkout time
- Add a note
- This updates `check_out_at`, sets `auto_clocked_out = false`, sets `approved_by` to the manager's user ID

Allowed roles: company_owner, company_admin, manager.

### Fix 5: Correlate late + early into partial shift detail
In `usePayrollBatchDetails.ts`, enrich partial shift entries to include:
- Late minutes (if any) on that same day
- Early departure minutes + reason (if any)
- Total hours short = late_minutes + early_minutes
- Surface this in the anomaly string: `Partial shift on 2026-03-15: 5.2h/8.0h (30min late + left 2.5h early — "Feeling sick")`

### Fix 6: Enhanced payroll PDF
Update `payrollReportPdf.ts` anomalies table to show:
- For partial shifts: scheduled vs actual hours, not just count
- For early departures: hours early + reason
- For auto clock-outs: flag as "⚠ Unverified" vs verified (manager-corrected)

## Files to Change

| File | Change |
|------|--------|
| **New SQL migration** | Add `hours_short numeric` column to `attendance_logs` |
| `src/pages/staff/StaffScanAttendance.tsx` | Smart threshold for mandatory reason; calculate + store `hours_short` at checkout |
| `supabase/functions/auto-clockout/index.ts` | Calculate `hours_short`; create `missing_checkout` alert |
| `src/pages/workforce/Attendance.tsx` | Add manager manual checkout action + dialog |
| `src/hooks/usePayrollBatchDetails.ts` | Correlate late + early into partial shift detail; include hours short |
| `src/lib/payrollReportPdf.ts` | Show hours breakdown for partials, early departures, unverified auto-clockouts |

## What does NOT change
- No changes to shift scheduling or assignment logic
- No changes to the scoring/gamification system
- Auto-clockout still runs as before; it just also creates an alert now
- Existing early departure reason flow still works; it becomes mandatory when partial

