

# Command Center Data Verification — March 18, 2026

## What the Database Actually Shows

### Live Workforce (at 20:40 local / 18:40 UTC)

| Employee | Location | Shift | Clock In (local) | Clock Out (local) | Status at 20:40 |
|----------|----------|-------|----------|-----------|---------|
| Cristian Cantili | Bab's Obor | 08:00–16:00 | 08:01 | 16:09 | **Left** |
| Bibek Thapa | Bab's Obor | 12:00–20:00 | 11:55 | 20:25 | **Left** |
| Romeo Kueta | LBFC Amzei | 10:00–23:50 | 10:11 | 23:11 | **Still in** |
| Iulian Constantin | LBFC Amzei | 11:00–23:50 | 10:55 | 00:20 | **Still in** |
| Craciun Andrei | LBFC Amzei | 14:00–23:00 | 14:22 | 23:30 | **Still in** |
| Thayab Abdullah | LBFC Amzei | 16:00–23:50 | 15:54 | 23:11 | **Still in** |
| Zack Adeyanju | LBFC Amzei | 10:00–16:00 | 10:00 | 16:30 | **Left** |
| Gabriela Mitan | LBFC Amzei | 10:00–23:50 | 10:01 | 12:49 | **Left** |

**Screenshot shows**: Bab's Obor 0/2, LBFC Amzei 4/6.
**Verdict**: The 4 "here" at LBFC Amzei are correct. But **Zack, Gabriela, Cristian, and Bibek show as "expected"** (gray, with "exp" prefix) even though they already worked and left. This is misleading — they fulfilled their shift.

### Today's Audits

| Audit | Location | DB Status | Score | Updated (local) |
|-------|----------|-----------|-------|----------|
| HACCP & Food safety | LBFC Amzei | scheduled | — | never started |
| HACCP & Food safety | LBFC Timpuri Noi | **compliant** | **100%** | 15:05 |
| Restaurant Daily Opening | Proper Ostroveni | non-compliant | 67% | 19:54 |
| Site Visit Checklist (2 Hours) | Executive | compliant | 100% | 18:21 |

**Screenshot shows**: 2 scheduled (both HACCP), 1 completed (Site Visit 100%).
**Issues found**:
- **HACCP at Timpuri Noi was completed at 15:05** but still shows as "Scheduled" — the recurring schedule doesn't check if a matching audit was already completed
- **HACCP at Timpuri Noi is also missing from "Completed"** — its `company_id` is NULL in the database, so the completed query (which filters by company_id) skips it
- Restaurant Daily Opening at Ostroveni (67%) correctly excluded — belongs to a different company

### Root Causes

1. **No "left/done" state in Live Workforce**: The code only has two states — "here" (open attendance log) and "expected" (scheduled shift, no open attendance). Employees who worked and checked out fall into "expected" because their attendance record has `check_out_at` filled. There's no third state for "worked and left."

2. **Recurring audits not deduplicated against completed audits**: `useTodayScheduledAudits` fetches from `recurring_audit_schedules` independently, without checking if a matching `location_audits` entry already exists for that template + location + date. So completed audits still appear as "scheduled."

3. **Missing `company_id` on location_audits**: Two HACCP audit entries (created Feb 15 via the recurring schedule pre-generation) have NULL `company_id`. This makes them invisible to the completed audits query.

4. **Cross-tenant leak in recurring schedules**: `recurring_audit_schedules` has no `company_id` column. The query fetches ALL active schedules across all companies. Currently mitigated by the location-company relationship, but it's a structural gap.

---

## Fix Plan

### Fix 1: Add "left" state to Live Workforce
**File**: `src/hooks/useMobileCommandData.ts`, `src/components/mobile-command/LiveWorkforceSection.tsx`

Query today's attendance logs that HAVE `check_out_at` (closed sessions). In the merge logic, check if a scheduled employee has a closed attendance record — if so, mark them as "left" instead of "expected." Display with a distinct style (e.g., strikethrough or dimmed green check with departure time).

### Fix 2: Deduplicate recurring audits against completed audits
**File**: `src/hooks/useMobileCommandData.ts` — `useTodayScheduledAudits`

After building the recurring items list, query `location_audits` for today's date and check for matching `template_id + location_id` combinations. Remove any recurring item that already has a completed (or in-progress) audit entry.

### Fix 3: Fix NULL company_id on location_audits
**Database migration**: Update the two NULL-company_id rows by looking up the company from their location. Add a NOT NULL constraint or default trigger to prevent this in the future.

```sql
UPDATE location_audits la
SET company_id = l.company_id
FROM locations l
WHERE la.location_id = l.id
  AND la.company_id IS NULL
  AND l.company_id IS NOT NULL;
```

### Fix 4: Scope recurring schedules to company
**File**: `src/hooks/useMobileCommandData.ts` — `useTodayScheduledAudits`

Since `recurring_audit_schedules` lacks a `company_id`, join through `locations` to filter by company: add `.eq('locations.company_id', companyId)` or filter client-side using the location's company membership.

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useMobileCommandData.ts` | Add closed-attendance query for "left" state; deduplicate recurring vs completed; scope recurring by company |
| `src/components/mobile-command/LiveWorkforceSection.tsx` | Add "left" visual state (dimmed green check + departure time) |
| Database migration | Fix NULL company_id rows; optionally add company_id column to recurring_audit_schedules |

