

# Dashboard KPI Cards — Verification Report

## Verification Results (Mar 12–19, 2026)

| Card | Displayed | DB Actual | Correct? | Notes |
|------|-----------|-----------|----------|-------|
| **Audit Score** | 97% | 97% (avg of 14 scored audits) | YES | Correct |
| **Task Completion** | 14% / 73 overdue | 14% (12/85) / 73 overdue | YES | Correct, but see issue below |
| **Workforce Score** | 0% / 0 employees | ERROR — RPC crashes | NO | RPC references `test_attempts` table that doesn't exist |
| **Open CAs** | 0 | 0 | YES | Correct |
| **Training** | N/A | 0 assignments | YES | Correct |
| **Attendance** | 89% | 89% (50/56) | YES | Correct |

## Issues Found

### Issue 1 (CRITICAL): Workforce Score RPC still broken — `test_attempts` table doesn't exist

The previous migration fixed 3 column names in the `task_completions` query, but there's another error: the function references `test_attempts` (line 335) which doesn't exist. The actual table is `test_submissions`.

Additionally, the column mappings differ:
- RPC uses `te.employee_id` — `test_submissions` has `employee_id` (correct)
- RPC uses `te.passed` — `test_submissions` has `passed` (correct)
- RPC uses `te.score` — `test_submissions` has `score` (correct)
- RPC uses `te.completed_at` — `test_submissions` has `completed_at` (correct)

So the only fix needed is: `FROM test_attempts te` → `FROM test_submissions te`

### Issue 2 (DESIGN): Task Completion ignores the date filter

`useTaskStats()` fetches ALL tasks for the company with no date filtering. The dashboard date picker (Mar 12–19) has no effect on this card. The 14% rate and 73 overdue reflect all-time data, not the selected week.

The other cards (Audit Score, Workforce Score, Attendance) all respect the date range. Tasks is the odd one out.

## Fix Plan

### Fix 1: Patch RPC — replace `test_attempts` with `test_submissions`

Single database migration to `CREATE OR REPLACE FUNCTION` with the table name corrected on line 335. This will make the Workforce Score card functional.

### Fix 2: Make Task Completion date-aware (optional, separate scope)

Pass `dateFrom`/`dateTo` into `useTaskStats` and filter tasks by `created_at` or `due_at` within the range. This would make the Task card consistent with the other five cards. However, this changes existing behavior and should be confirmed as desired.

### Files to Change

| File | Change |
|------|--------|
| Database migration | Replace `test_attempts` with `test_submissions` in the RPC |

