

# Bug: Staff Sees Tasks From All Locations Instead of Only Their Shift Location

## Root Cause

In `src/lib/unifiedTaskPipeline.ts` (lines 142-164), the **execution mode** has an "accountability" feature: overdue tasks are re-added to the visible list **regardless of coverage**. The logic at line 147-149 grabs ALL overdue tasks across all locations — not just those at the employee's shift location.

Since `useStaffTodayTasks` fetches role tasks without location filtering (relying on coverage to scope them), tasks from LBFC Obor and LBFC Timpuri Noi correctly get `hasCoverage: false` (no shift exists there). But because they're overdue ("Time expired!"), they bypass the coverage filter via `overdueRegardlessOfCoverage` and appear in the list.

The intent of this feature was: "if a task WAS covered during your shift but you didn't complete it, it should stay visible after your shift ends for accountability." The bug is it includes tasks that were **never** at the employee's location.

## Fix

**File: `src/lib/unifiedTaskPipeline.ts` (lines 147-149)**

Change the `overdueRegardlessOfCoverage` filter to only include overdue tasks whose `noCoverageReason` is NOT `location_mismatch`. Tasks that failed coverage due to location mismatch were never relevant to this employee. Tasks that failed due to `no_shift` (shift ended), `no_approved_assignments`, or time-based reasons WERE at the right location and should remain visible for accountability.

```typescript
const overdueRegardlessOfCoverage = tasksWithCoverage.filter(
  (t) => t.status !== "completed" && baseIsTaskOverdue(t) &&
    // Only re-add overdue tasks that were at the right location but lost coverage
    // for time/assignment reasons — NOT tasks from different locations entirely
    t.coverage?.noCoverageReason !== "location_mismatch"
);
```

### Files Changed
- `src/lib/unifiedTaskPipeline.ts` — Scope overdue accountability to same-location tasks only

