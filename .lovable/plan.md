

## Sync `status` and `is_published` Fields on Shifts

### Problem
The `shifts` table has two fields that should stay in sync:
- `is_published` (boolean) -- used by the coverage engine, UI indicators
- `status` (text, e.g. `'draft'`, `'published'`, `'active'`) -- used by governance logic

Multiple code paths update one without the other:
- `useBulkPublishShifts` sets only `is_published`, leaving `status` as `'draft'`
- `EnhancedShiftDialog` checkbox toggles `is_published` without touching `status`
- `useCopySchedule` copies `is_published` from source shift but ignores `status`

This caused 275 shifts with `status='draft'` + `is_published=true`, making them appear on task coverage despite being drafts.

### Solution: Database Trigger

Rather than patching every code path (fragile), create a PostgreSQL trigger that automatically keeps the two fields in sync on every INSERT or UPDATE:

```text
Trigger logic (on shifts BEFORE INSERT OR UPDATE):
  - If is_published changed to TRUE  --> set status = 'published'
  - If is_published changed to FALSE --> set status = 'draft'
  - If status changed to 'draft'     --> set is_published = false
  - If status changed to 'published' --> set is_published = true
```

This guarantees consistency regardless of which field any code path updates.

### Changes

| Change | Detail |
|--------|--------|
| **Database migration** | Create trigger function `sync_shift_publish_status()` and attach it to `shifts` table as a `BEFORE INSERT OR UPDATE` trigger |

### Technical Details

**Migration SQL:**

```sql
CREATE OR REPLACE FUNCTION public.sync_shift_publish_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- On INSERT: sync based on whichever field is set
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_published = true AND (NEW.status IS NULL OR NEW.status = 'draft') THEN
      NEW.status := 'published';
    ELSIF NEW.status = 'published' AND (NEW.is_published IS NULL OR NEW.is_published = false) THEN
      NEW.is_published := true;
    ELSIF (NEW.is_published IS NULL OR NEW.is_published = false) AND (NEW.status IS NULL OR NEW.status = 'draft') THEN
      NEW.status := 'draft';
      NEW.is_published := false;
    END IF;
    RETURN NEW;
  END IF;

  -- On UPDATE: detect which field changed and sync the other
  -- Skip sync for cancelled/deleted statuses (those have their own lifecycle)
  IF NEW.status IN ('cancelled', 'deleted') THEN
    RETURN NEW;
  END IF;

  IF OLD.is_published IS DISTINCT FROM NEW.is_published THEN
    IF NEW.is_published = true THEN
      NEW.status := 'published';
    ELSE
      NEW.status := 'draft';
    END IF;
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'published' THEN
      NEW.is_published := true;
    ELSIF NEW.status = 'draft' THEN
      NEW.is_published := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_shift_publish_status
  BEFORE INSERT OR UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_shift_publish_status();
```

### No Application Code Changes Required

The trigger operates at the database level, so all existing code paths (`useBulkPublishShifts`, `EnhancedShiftDialog`, `useCopySchedule`, `useTrainingAssignments`, `apply_schedule_change_request`, etc.) will automatically benefit from the sync without any modifications.

### Impact
- All future publish/unpublish operations will keep both fields consistent
- The previous data cleanup migration already fixed the 275 existing inconsistent rows
- `cancelled` and `deleted` statuses are excluded from sync to preserve their lifecycle
