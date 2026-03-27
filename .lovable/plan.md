
Fix the multi-week employee view end-to-end in this order:

1. Root cause to fix first
- The multi-week sheet is not just “cached”; its main query is failing.
- Evidence from network logs: the `shift_assignments -> shifts!inner(...)` request returns `400 PGRST200` because `EmployeeMultiWeekView.tsx` selects `employee_roles(color)` from `shifts`, but `shifts` has no relationship to `employee_roles`.
- Result: the sheet silently ends up with no rows, so newly created shifts exist in the database but never render.

2. Frontend fixes
- Update `src/components/workforce/EmployeeMultiWeekView.tsx`
  - Remove the invalid `employee_roles(color)` join from the multi-week query.
  - Keep the query employee-scoped via `shift_assignments` and `approval_status = 'approved'`.
  - Replace color usage with a safe fallback derived from existing shift fields/UI tokens so the cards still render consistently.
  - Add explicit loading / error / empty states inside the sheet so query failures are visible instead of looking like “0 shifts”.
- Update the query result shaping defensively
  - Deduplicate by `shift.id` before rendering.
  - Ensure only non-cancelled shifts are shown.
- Verify `onCreateShift` / `onEditShift` path still passes the full shift object required by `EnhancedShiftDialog`.

3. Assignment validation fixes
- Update `src/hooks/useShiftAssignments.ts`
  - Normalize overlap checks so they only compare against active assignments on non-cancelled shifts.
  - Exclude the current shift consistently.
  - Also ignore duplicate/self records safely if multiple assignment rows are returned.
- Cross-check the date-level helper query in `EnhancedShiftDialog.tsx`
  - It currently fetches same-day assignments for warnings but does not filter cancelled shifts.
  - Add the same cancelled-shift exclusion there so warnings match mutation behavior.

4. UX consistency fixes
- In `src/components/workforce/EnhancedShiftDialog.tsx`
  - Make the employee conflict warning logic use the same overlap rules as the actual assignment mutation.
  - Surface clearer feedback when a conflict is real vs when the multi-week view data failed to load.
- In `src/hooks/useRealtimeShifts.ts` and `src/hooks/useShifts.ts`
  - Keep the existing `employee-shifts-multiweek` invalidation.
  - Ensure assignment mutations also invalidate the multi-week key wherever assignment create/delete affects the employee sheet.

5. Backend/data verification to re-test after implementation
- Confirm the existing shifts for Grecea Alexandru on 2026-03-27 and 2026-03-28 are returned by the fixed employee-scoped query.
- Confirm the multi-week sheet shows them immediately after open and after create.
- Confirm creating a truly overlapping shift still blocks.
- Confirm creating a non-overlapping shift succeeds and appears in the sheet without reopening.
- Confirm editing an existing shift does not self-block.
- Confirm cancelled/deleted shifts no longer count for warnings or assignment validation.

6. Files to change
- `src/components/workforce/EmployeeMultiWeekView.tsx`
- `src/hooks/useShiftAssignments.ts`
- `src/components/workforce/EnhancedShiftDialog.tsx`
- Possibly `src/hooks/useRealtimeShifts.ts` if assignment-side invalidation is incomplete

7. Technical notes
```text
Current confirmed failure:
EmployeeMultiWeekView
  -> query shift_assignments + shifts!inner(...)
  -> includes invalid relation employee_roles(color)
  -> backend returns 400
  -> UI shows 0 shifts

Separate but related risk:
EnhancedShiftDialog warning query
  -> same-day assignment scan
  -> does not exclude cancelled shifts
  -> warning logic can disagree with mutation logic
```

8. Validation checklist after fix
- Open employee multi-week sheet for Grecea Alexandru -> existing 27/28 Mar shifts visible
- Create shift from multi-week sheet -> appears immediately
- Reopen sheet after hard refresh -> still visible
- Create overlapping shift -> blocked with correct error
- Edit existing shift with same employee -> no false conflict
- Remove/cancel shift -> disappears from sheet and no longer blocks assignment
