

## Fix: "Extra" Shift Type Rejected by Database

### Problem
When creating a shift with **Shift Type = "Extra"**, the database rejects it with:
> `new row for relation "shifts" violates check constraint "shifts_shift_type_check"`

The database constraint only allows `'regular'` and `'training'`, but the UI offers `'extra'` as a third option.

### Root Cause
The `shifts` table has a CHECK constraint:
```
CHECK (shift_type = ANY (ARRAY['regular', 'training']))
```
The UI added `'extra'` as a valid shift type but the database constraint was never updated to include it.

### Fix

1. **Database migration** -- alter the CHECK constraint to allow `'extra'`:

```sql
ALTER TABLE shifts DROP CONSTRAINT shifts_shift_type_check;
ALTER TABLE shifts ADD CONSTRAINT shifts_shift_type_check 
  CHECK (shift_type = ANY (ARRAY['regular', 'training', 'extra']));
```

No code changes needed -- the UI and hooks already handle `'extra'` correctly; only the DB constraint is blocking it.

### Result
Users can create shifts with Shift Type = "Extra" without errors.
