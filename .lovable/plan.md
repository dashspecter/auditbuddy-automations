

# Fix: Database CHECK Constraint Blocking Half Shift Types

## Root Cause

The `shifts` table has a database CHECK constraint (`shifts_shift_type_check`) that only allows three values:

```
CHECK (shift_type = ANY (ARRAY['regular', 'training', 'extra']))
```

When the UI sends `'half'` or `'extra_half'`, the database rejects the insert — causing the "Something Went Wrong" error.

## Fix

A single database migration to update the constraint to include the two new values:

```sql
ALTER TABLE public.shifts DROP CONSTRAINT shifts_shift_type_check;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_shift_type_check 
  CHECK (shift_type = ANY (ARRAY['regular', 'training', 'extra', 'half', 'extra_half']));
```

No code changes needed — the UI and payroll logic already handle `'half'` and `'extra_half'` correctly from the previous implementation. This is purely a database constraint issue.

