

## Full Verification Report: Shift Scheduling Implementation

### Status: All 7 Plan Steps Verified

---

### Step 1: Database Migration — CORRECT

**Trigger (`sync_shift_publish_status`)** — Confirmed live in the database (visible in `<supabase-configuration>`). Handles all three statuses correctly:
- `status='open'` → sets `is_published=true`, `is_open_shift=true`
- `status='published'` → sets `is_published=true`, `is_open_shift=false`
- `status='draft'` → sets `is_published=false`, `is_open_shift=false`
- UPDATE path correctly detects which field changed (status vs is_published) and syncs the other

**Constraint** — `'open'` was added to `shifts_status_check` in the earlier migration. Confirmed working since no constraint errors appear in postgres logs.

---

### Step 2: Cache Invalidation (Issue 1) — CORRECT

All four mutations in `useShifts.ts` use broad invalidation:
- `useCreateShift` (line 308): `queryClient.invalidateQueries({ queryKey: ["shifts"], exact: false })`
- `useUpdateShift` (line 335): same pattern
- `useDeleteShift` (line 359): same pattern
- `useBulkPublishShifts` (line 385): same pattern

All also invalidate `pending-approvals`. Realtime subscription (`useRealtimeShifts`) also invalidates. **Draft shifts will now appear immediately after creation.**

---

### Step 3: Approvals Button (Issue 2) — CORRECT

- Button is always visible (lines 621-649), no governance gate
- Badge count includes **both** governance items AND pending shift assignments:
  ```
  pendingShiftAssignmentCount = shifts.reduce(...)  // line 198-199
  governanceApprovalsCount = governanceItemsCount + pendingShiftAssignmentCount  // line 200
  ```
- When governance is disabled, `governanceItemsCount = 0` but `pendingShiftAssignmentCount` still contributes

---

### Step 4: Employee View Filtering (Issue 4C) — CORRECT

`StaffHome.tsx` line 230-231 filters:
```typescript
const validAssignments = (assignmentsData || []).filter(
  (a: any) => a.shifts && a.shifts.shift_date >= today && a.shifts.is_published === true
);
```
Draft shifts (`is_published=false`) are excluded. Employees only see Published and Open shifts.

---

### Step 5: Status Dropdown in Dialog (Issue 4B) — CORRECT

- **Dropdown** at lines 1206-1237 with Draft/Open/Published options, each with colored dot and description
- **Edit initialization** (line 261-263) correctly derives status from existing shift:
  ```typescript
  const derivedStatus = shift.status === 'open' ? 'open' : (shift.is_published ? 'published' : 'draft');
  ```
- **Submit** uses `deriveStatusFlags()` (lines 412-417) to map back to booleans
- **Both update and create paths** strip `shift_status` from formData and spread `statusFlags` into the payload (lines 469-472 for update, 582-585 for create, 510-513 for batch)

---

### Step 6: Schedule Grid — Draft vs Open (Issue 4E) — CORRECT

- Row labeled "Draft / Open" (line 889)
- `getUnassignedDraftShiftsForDay()` filters for `!is_published && !is_open_shift` — true draft shifts
- `getOpenShiftsForDayUnassigned()` filters for `is_open_shift && no approved assignments` — open claimable shifts
- **Draft badge**: `border-orange-500 text-orange-500` with "Draft" text (line 909)
- **Open badge**: `border-amber-500 text-amber-500` with "Open" text (line 961)
- Draft uses `border-dashed`, Open uses `border-solid` — additional visual distinction

---

### Step 7: Open Shift Claiming Logic — NOT YET IMPLEMENTED

This was listed as the final step in the plan. The employee-facing claiming flow (where an employee sees open shifts matching their role and can claim them) does not yet exist in `StaffHome.tsx`. This is a new feature that would need:
- A query in StaffHome for open shifts matching the employee's role
- A UI section showing claimable shifts
- A claim action that creates a `shift_assignment` with `approval_status: 'pending'`

This was acknowledged in the original plan as a separate step.

---

### Remaining Issues Found

**1. Missing `status` field in shift create/update payload**
The submit handler sends `is_published` and `is_open_shift` booleans but does NOT send the `status` text field. This relies entirely on the database trigger to sync `status` from the booleans. This works but creates a subtle issue: when creating an "Open" shift, the insert sends `is_published: true, is_open_shift: true` but `status` defaults to `'draft'`. The trigger's INSERT path checks `is_published = true AND status = 'draft'` → sets `status = 'published'`, which is wrong — it should be `'open'`.

Let me re-read the trigger carefully... Actually, the INSERT path checks in this order:
1. `NEW.status = 'open'` — won't match (status defaults to 'draft')
2. `NEW.is_published = true AND (status IS NULL OR status = 'draft')` — MATCHES → sets `status = 'published'`

This means creating an Open shift via the UI will result in `status = 'published'` instead of `status = 'open'`. **This is a bug.** The fix is to include `status` in the payload sent to the database, matching the dropdown value.

**2. Bulk publish converts Open shifts to Published**
When the "Publish Week" button is clicked, it sets `is_published: true` on all unpublished shifts. The trigger's UPDATE path detects `is_published` changed and sets `status = CASE WHEN is_open_shift THEN 'open' ELSE 'published' END`. This is correct — open shifts stay open.

However, `unpublishedWeekShiftIds` likely includes open shifts (which have `is_published: true` already), so they wouldn't be in the unpublished list. This is also correct.

---

### Summary

| Item | Status |
|------|--------|
| Database trigger for 'open' status | Done |
| Cache invalidation (no-refresh bug) | Done |
| Approvals badge includes shift claims | Done |
| Employee view hides draft shifts | Done |
| Status dropdown in shift dialog | Done |
| Grid distinguishes Draft vs Open | Done |
| Open shift claiming (employee side) | Not started |
| **Bug: `status` field not sent in payload** | **Needs fix** |

### Recommended Fix

In `EnhancedShiftDialog.tsx`, the `deriveStatusFlags` function should also include the `status` text field so the database trigger doesn't have to infer it:

```typescript
const deriveStatusFlags = (status: 'draft' | 'open' | 'published') => ({
  is_open_shift: status === 'open',
  is_published: status === 'open' || status === 'published',
  status: status,  // Send explicit status to DB
});
```

This one-line addition prevents the trigger from incorrectly mapping an Open shift to Published on INSERT.

### Implementation

Single change in `src/components/workforce/EnhancedShiftDialog.tsx` — add `status: status` to the `deriveStatusFlags` return object (line 412-415).

