

## Fix: Coverage Engine Should Require Published Shifts Only

### Problem
The user `test@lbfc.ro` sees tasks despite not appearing on any schedule because they have a shift with **`status: 'draft'`** but **`is_published: true`**. The coverage engine at line 158 of `taskCoverageEngine.ts` only checks `is_published !== false`, so these inconsistent draft shifts are treated as valid coverage.

Database shows **275 shifts** in this broken state (`status: 'draft'`, `is_published: true`), meaning this affects many users -- not just this test account.

### Root Cause

```text
// Current filter (line 158 of taskCoverageEngine.ts)
const dateShifts = shifts.filter(s => s.shift_date === taskDateStr && s.is_published !== false);
```

This only excludes shifts where `is_published` is explicitly `false`. A shift with `status: 'draft'` and `is_published: true` (a data inconsistency) passes right through.

### Fix

**File: `src/lib/taskCoverageEngine.ts`** (line 158)

Update the shift filter to also exclude `status: 'draft'` shifts:

```typescript
const dateShifts = shifts.filter(
  s => s.shift_date === taskDateStr 
    && s.is_published !== false 
    && s.status !== 'draft'
);
```

**File: `src/hooks/useShiftCoverage.ts`**

Update the shifts query to include the `status` field so the engine can filter on it:

```text
// Add 'status' to the select clause (around line 68)
.select(`
  id,
  location_id,
  shift_date,
  start_time,
  end_time,
  role,
  status,
  is_published,
  shift_assignments!left(id, staff_id, approval_status)
`)
```

And include `status` in the mapped result object.

**File: `src/lib/taskCoverageEngine.ts`** (Shift interface, around line 25)

Add `status` to the `Shift` interface:

```typescript
export interface Shift {
  id: string;
  location_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role: string;
  status?: string;       // <-- add this
  is_published?: boolean;
  shift_assignments?: Array<{...}>;
}
```

### Data Cleanup (Optional)

There are 275 shifts with `status: 'draft'` but `is_published: true`. Optionally, a migration can fix this inconsistency:

```sql
UPDATE shifts SET is_published = false WHERE status = 'draft' AND is_published = true;
```

This is recommended but not strictly required since the code fix above handles it.

### Changes Summary

| File | Change |
|------|--------|
| `src/lib/taskCoverageEngine.ts` | Add `status` to Shift interface; update filter to exclude `status: 'draft'` |
| `src/hooks/useShiftCoverage.ts` | Add `status` to the select query and mapped result |

### Impact
- Draft shifts will no longer grant task visibility to employees
- Only properly published shifts will count as coverage
- No effect on tasks with `execution_mode: 'always_on'` (those bypass coverage entirely)
- Fixes the issue for the test account and all other users affected by the data inconsistency
