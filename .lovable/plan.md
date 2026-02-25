

## Verification Report: Shift Scheduling Plan Implementation

### What Was Implemented Correctly

**1. Cache Invalidation (Issue 1) — DONE**
All mutations in `useShifts.ts` already use `exact: false` for query invalidation and also invalidate `pending-approvals`. The realtime subscription also invalidates broadly. This fix is complete.

**2. Shift Dialog Status Dropdown (Issue 4B) — DONE**
The `EnhancedShiftDialog.tsx` now has a proper `shift_status` field with Draft / Open / Published dropdown (lines 1207-1237). The `deriveStatusFlags` function correctly maps:
- Draft → `is_open_shift: false, is_published: false`
- Open → `is_open_shift: true, is_published: true`
- Published → `is_open_shift: false, is_published: true`

**3. Employee View Filtering (Issue 4C) — DONE**
`StaffHome.tsx` (line 231) correctly filters out draft shifts: `a.shifts.is_published === true`.

**4. Approvals Button Visibility (Issue 2) — PARTIALLY DONE**
The Approvals button is now always visible (not gated behind governance). However, the badge count still only shows governance items (`pendingChangeRequests + pendingExceptions`). It does NOT include pending shift assignment count. So the badge will still show 0 if governance is disabled, even if there are pending shift claims.

**5. Schedule Grid Draft/Open Row (Issue 4E) — DONE**
The row is renamed "Draft / Open" and uses separate functions `getUnassignedDraftShiftsForDay` and `getOpenShiftsForDayUnassigned`.

**6. Database Constraint — DONE**
The migration added `'open'` to the `shifts_status_check` constraint and migrated existing `is_open_shift=true` rows.

---

### Issues Found — Needs Fixing

#### Issue A: `sync_shift_publish_status` trigger does NOT handle `'open'` status

The trigger (defined in migration `20260224135446`) has no awareness of the `'open'` status. When a shift is created with `status='open'` and `is_published=true`, `is_open_shift=true`:

- On INSERT: the trigger sees `is_published=true` and `status != 'draft'` but `status != 'published'` either — it falls through to the `ELSIF` which checks `status = 'published'`. Since `status = 'open'`, none of the branches match, so no sync happens. This is actually OK for the insert case since both booleans are already set correctly by the dialog.
- On UPDATE: if someone updates `is_published` (e.g., bulk publish), the trigger will overwrite `status` to `'published'`, losing the `'open'` distinction. Conversely, if `status` is set to `'open'`, the trigger doesn't set `is_published=true` or `is_open_shift=true`.

**Fix needed:** Update the trigger to handle `'open'` status:
- `status='open'` → `is_published=true`, `is_open_shift=true`
- When `is_open_shift` changes to `true` + `is_published=true` → `status='open'`
- Skip sync for `'open'` status (don't overwrite to `'published'`)

#### Issue B: Approvals badge count excludes pending shift assignments

At line 195, `governanceApprovalsCount` only counts governance items. The badge shows 0 when there are pending shift claims but governance is disabled. Need to add pending shift assignment count from the loaded shifts data.

**Fix:** Count pending assignments from `shifts` data and add to badge:
```
const pendingShiftAssignmentCount = shifts.reduce((count, shift) => 
  count + (shift.shift_assignments?.filter(sa => sa.approval_status === 'pending').length || 0), 0);
const totalApprovalsCount = governanceApprovalsCount + pendingShiftAssignmentCount;
```

#### Issue C: Open shifts rendered with no distinct badge in the Draft/Open row

Looking at lines 888-930, I need to verify the open shifts render with an amber badge vs the gray draft badge. Let me confirm this is handled.

---

### Implementation Plan

| Step | Description | File |
|------|-------------|------|
| 1 | Update `sync_shift_publish_status` trigger to handle `'open'` status correctly | New migration SQL |
| 2 | Add pending shift assignment count to the Approvals badge in the week view | `src/components/workforce/EnhancedShiftWeekView.tsx` |
| 3 | Verify open shift badges render distinctly (amber vs gray) in the Draft/Open row | `src/components/workforce/EnhancedShiftWeekView.tsx` |

### Technical Details

**Trigger update (Step 1):**
```sql
CREATE OR REPLACE FUNCTION public.sync_shift_publish_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'deleted') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'open' THEN
      NEW.is_published := true;
      NEW.is_open_shift := true;
    ELSIF NEW.is_published = true AND (NEW.status IS NULL OR NEW.status = 'draft') THEN
      NEW.status := 'published';
    ELSIF NEW.status = 'published' THEN
      NEW.is_published := true;
    ELSIF NEW.status IS NULL OR NEW.status = 'draft' THEN
      NEW.status := 'draft';
      NEW.is_published := false;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE path
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'open' THEN
      NEW.is_published := true;
      NEW.is_open_shift := true;
    ELSIF NEW.status = 'published' THEN
      NEW.is_published := true;
      NEW.is_open_shift := false;
    ELSIF NEW.status = 'draft' THEN
      NEW.is_published := false;
      NEW.is_open_shift := false;
    END IF;
  ELSIF OLD.is_published IS DISTINCT FROM NEW.is_published THEN
    IF NEW.is_published = true THEN
      NEW.status := CASE WHEN NEW.is_open_shift THEN 'open' ELSE 'published' END;
    ELSE
      NEW.status := 'draft';
      NEW.is_open_shift := false;
    END IF;
  END IF;

  RETURN NEW;
END; $$;
```

**Approvals badge fix (Step 2):** Compute pending shift assignment count from already-loaded shift data and add to badge total.

