

## Comprehensive Fix Plan: Shift Scheduling Issues

This plan addresses 4 interconnected bugs in the shift scheduling system and introduces a clearer shift status model (Draft / Open / Published).

---

### Issue 1: Draft shifts only appear after hard refresh

**Root cause:** When a new shift is created via `EnhancedShiftDialog`, the query cache key `["shifts", locationId, startDate, endDate, type]` may not match exactly due to normalization differences (e.g., `undefined` vs `null` vs `"all"`). The realtime subscription in `useRealtimeShifts` does invalidate `queryKey: ["shifts"]` but this is a prefix match -- it should work. The more likely issue is that newly created shifts are inserted with `is_published: false` and `is_open_shift: false`, which means they should appear in the "Draft (Unassigned)" row. However, `getUnassignedDraftShiftsForDay` at line 292 filters for `!shift.is_published && no approved assignments`. If the shift was created with an assignment that's in "pending" status, it correctly falls into this row. But if the mutation's `onSuccess` doesn't properly invalidate, the UI won't update.

**Fix:** Ensure `useCreateShift` and `useUpdateShift` mutations invalidate all shift query keys with a broader prefix. Also verify `useRealtimeShifts` invalidation is working. Add `queryClient.invalidateQueries({ queryKey: ["shifts"], exact: false })` to all shift mutation success handlers.

**Files:** `src/hooks/useShifts.ts`

---

### Issue 2: Pending approvals always shows 0

**Root cause:** The `usePendingApprovals` hook queries `shift_assignments` where `approval_status = 'pending'`. This query has no company scoping -- it returns ALL pending assignments across all companies. However, RLS policies on `shift_assignments` likely restrict visibility. The issue is that when a manager assigns an employee via the shift dialog, the assignment may be auto-approved (the `auto_approve_training_shift_assignment` trigger only handles training shifts, but there may be other triggers or the dialog itself may set `approval_status: 'approved'` directly for manager-created assignments). When an employee claims a shift, the assignment should be created as `pending`, but this claim flow may not exist yet.

Additionally, the Approvals button in `EnhancedShiftWeekView` (line 608) is **only visible when governance is enabled** (`isGovernanceEnabled`). If governance is disabled, the button with the pending count badge is hidden entirely.

**Fix:**
1. Make the Approvals button always visible (not gated behind `isGovernanceEnabled`), showing shift assignment pending count.
2. Include shift assignment pending count in the total badge, not just governance items.
3. Verify RLS policies allow managers to see pending assignments for their company.

**Files:** `src/components/workforce/EnhancedShiftWeekView.tsx`, `src/hooks/useShiftAssignments.ts`

---

### Issue 3: Employee name doesn't appear for claimed shifts in schedule view

**Root cause:** In the location view (line 1225), employee names are shown only for `approvedAssignments`. If a shift was claimed by an employee, the assignment is in `pending` status. The code at line 1252-1267 does handle pending assignments when `assignedCount === 0`, showing them with amber "Pending" text. However, if the employee claimed it AND a manager approved it, the name should show normally. The bug is likely that the `useShifts` query (line 72) only fetches `shift_assignments(id, staff_id, shift_id, approval_status)` -- it does NOT fetch `employees(full_name)` as a join. Instead, employee names are resolved client-side via `employees.find(e => e.id === sa.staff_id)`. If the claiming employee is not in the loaded `employees` list (e.g., from a different location), the name won't resolve.

**Fix:** The `useEmployees` hook at line 127 already loads ALL active employees (`undefined` location). So the issue is more likely that the assignment exists but with `approval_status: 'pending'`, so it's rendered in the amber pending style rather than as a normal assignment. This is actually correct behavior -- pending assignments show differently. The fix should ensure that once approved, the cache is properly refreshed.

**Files:** `src/components/workforce/EnhancedShiftWeekView.tsx`, potentially `src/hooks/useShiftAssignments.ts`

---

### Issue 4: New Shift Status Model (Draft / Open / Published)

**Current state:** Shifts have `is_published` (boolean) and `status` (text: draft/published/cancelled) synced by the `sync_shift_publish_status` trigger. There's also `is_open_shift` (boolean) for shifts any employee can claim.

**Proposed model:**
- **Draft** (`status='draft', is_published=false`): Internal only, not visible to employees. Shows in scheduling view with "Draft" badge.
- **Open** (`status='open', is_open_shift=true, is_published=true`): Visible to employees with matching role who don't already have a shift that day. No specific employee assigned.
- **Published** (`status='published', is_published=true`): Has assigned employee(s); visible in schedule and employee's personal view. If no employee assigned, behaves like Open (claimable by role).

**Changes needed:**

#### A. Database Migration
- Add `'open'` to the shift status values (currently: draft, published, cancelled).
- Update the `sync_shift_publish_status` trigger to handle the `open` status: `status='open'` sets `is_published=true` and `is_open_shift=true`.

#### B. Shift Dialog (`EnhancedShiftDialog.tsx`)
- Replace the current `is_published` checkbox + `is_open_shift` checkbox with a single "Status" dropdown: Draft / Open / Published.
- Draft: `is_published=false, is_open_shift=false`
- Open: `is_published=true, is_open_shift=true`
- Published: `is_published=true, is_open_shift=false`

#### C. Employee View Filtering (`StaffHome.tsx`)
- Currently loads all assignments with `approval_status IN ('approved', 'pending')` without checking `is_published`. Draft shifts are visible to employees.
- **Fix:** Add a join filter or client-side filter to exclude shifts where `status='draft'` (or `is_published=false`).

#### D. Open Shift Visibility
- When employee views open shifts, filter to only show those where the employee's role matches AND they don't already have a shift on that date.
- This is new logic in the staff schedule page.

#### E. Schedule Grid Updates (`EnhancedShiftWeekView.tsx`)
- Update the "Draft (Unassigned)" row to also show "Open" shifts distinctly (with a different badge color).
- Update legend to include Open status.

---

### Implementation Order

| Step | Description | Files |
|------|-------------|-------|
| 1 | Database migration: allow `'open'` status, update trigger | Migration SQL |
| 2 | Fix shift mutation cache invalidation (Issue 1) | `src/hooks/useShifts.ts` |
| 3 | Show Approvals button without governance gate + include shift assignment count (Issue 2) | `src/components/workforce/EnhancedShiftWeekView.tsx` |
| 4 | Add `is_published` filter to employee shift loading (Issue 4C) | `src/pages/staff/StaffHome.tsx` |
| 5 | Replace checkboxes with Draft/Open/Published selector in shift dialog (Issue 4B) | `src/components/workforce/EnhancedShiftDialog.tsx` |
| 6 | Update schedule grid to distinguish Open vs Draft (Issue 4E) | `src/components/workforce/EnhancedShiftWeekView.tsx` |
| 7 | Add Open shift claiming logic for employees | Staff schedule page |

### Risk Assessment
- The `sync_shift_publish_status` trigger must be updated carefully to avoid breaking existing shifts.
- Existing shifts with `is_open_shift=true` should be migrated to `status='open'`.
- All changes are additive; existing Draft and Published logic continues to work.

