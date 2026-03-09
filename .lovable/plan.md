

# Exception Approval/Denial Has No Effect on Scores or Payroll

## The Problem

When you **Approve** (excuse) or **Deny** a late-start exception, **nothing changes** in either the Payroll Summary or Performance Scores. Both Test 2 (denied) and Test 3 (approved) show identical data because the exception resolution status is never consulted by any downstream system.

## Root Cause — Three Disconnected Systems

```text
┌─────────────────────┐
│  workforce_exceptions │  ← status updated to approved/denied/resolved
│  (late_start record)  │
└─────────┬───────────┘
          │  ✗ NOTHING reads this status
          │
┌─────────┴───────────┐     ┌───────────────────────┐
│   attendance_logs    │     │  usePayroll.ts         │
│   is_late = true     │────▶│  reads is_late directly│
│   late_minutes = 277 │     │  no exception check    │
└──────────────────────┘     └───────────────────────┘
          │
          │  ✗ is_late is never cleared on "Approve"
          │
┌─────────┴────────────────────────────────────┐
│  calculate_location_performance_scores (RPC)  │
│  Line 194-200: counts is_late = true directly │
│  Never joins workforce_exceptions             │
└───────────────────────────────────────────────┘
```

**In short**: The Approve/Deny buttons update the `workforce_exceptions.status` column, but:
1. **Payroll** (`usePayroll.ts` line 242) reads `attendance_logs.is_late` directly — never checks exceptions
2. **Performance RPC** (line 194-200) counts `attendance_logs.is_late = true` directly — never joins exceptions
3. **No system** clears `is_late` or adjusts `late_minutes` when an exception is approved

The exception system is currently **informational only** — it records decisions but they have zero impact.

## What Needs to Change

### 1. Performance Scoring RPC — Exclude Excused Lates
**File**: New migration updating `calculate_location_performance_scores`

In the punctuality section (currently lines 194-200), change the late count query to exclude lates that have an approved exception:

```sql
-- Current (broken): counts ALL lates
SELECT COUNT(*), COALESCE(SUM(al.late_minutes), 0)
FROM attendance_logs al
WHERE al.staff_id = v_emp.id AND al.is_late = true ...

-- Fixed: exclude excused lates
SELECT COUNT(*), COALESCE(SUM(al.late_minutes), 0)
FROM attendance_logs al
WHERE al.staff_id = v_emp.id AND al.is_late = true
  AND NOT EXISTS (
    SELECT 1 FROM workforce_exceptions we
    WHERE we.attendance_id = al.id
      AND we.exception_type = 'late_start'
      AND we.status = 'approved'
  ) ...
```

### 2. Payroll Hook — Flag Excused Lates
**File**: `src/hooks/usePayroll.ts`

After fetching attendance logs, also fetch approved late exceptions and cross-reference. If a late arrival has an approved exception, set `isLate = false` and `lateMinutes = 0` for payroll purposes.

### 3. Payroll Batch Details — Same Fix
**File**: `src/hooks/usePayrollBatchDetails.ts`

Same pattern: exclude excused lates from `late_count` and `total_late_minutes`.

### 4. Payroll Summary UI — Show Excused Indicator
**File**: Payroll summary component

When a late is excused, show it differently (e.g., strikethrough or "(excused)" label) so managers see the exception was handled.

### 5. Help Text / Tooltips on Exception Buttons
**File**: `src/components/workforce/PendingApprovalsDialog.tsx`

Update the existing tooltips to reflect the actual impact once implemented:
- **Approve**: "Excuse this late arrival — it will NOT count against the employee's punctuality score or payroll late count."
- **Deny**: "Keep this late arrival on record — it WILL count against the employee's punctuality score."
- **Resolve**: "Acknowledge without excusing — the late arrival remains on record and affects scores."

## Files Changed

| File | Change |
|---|---|
| New SQL migration | Update `calculate_location_performance_scores` to exclude approved late exceptions from punctuality |
| `src/hooks/usePayroll.ts` | Fetch approved late exceptions, exclude from `is_late` / `late_minutes` |
| `src/hooks/usePayrollBatchDetails.ts` | Same exclusion for batch payroll |
| Payroll summary component | Visual indicator for excused lates |
| `src/components/workforce/PendingApprovalsDialog.tsx` | Update tooltip text to reflect actual impact |

No new tables needed — `workforce_exceptions` already has `attendance_id`, `exception_type`, and `status` columns.

