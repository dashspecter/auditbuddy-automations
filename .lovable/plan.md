

# Fix: "Record Absence" Fails Due to Check Constraint

## Root Cause

The `workforce_exceptions` table was created with a CHECK constraint that only allows these `exception_type` values:

```
'late_start', 'early_leave', 'unscheduled_shift', 'no_show', 'shift_extended', 'overtime'
```

The "Record Absence" dialog passes `exception_type: 'absence'`, which the database rejects. The value `'absence'` was never added to the allowed list.

## The Fix

**One database migration** to update the CHECK constraint:

1. Drop the existing `workforce_exceptions_exception_type_check` constraint
2. Re-create it with `'absence'` added to the allowed values

No code changes needed — the dialog and RPC already pass the correct value; the database just doesn't accept it yet.

## Migration SQL

```sql
ALTER TABLE public.workforce_exceptions
  DROP CONSTRAINT workforce_exceptions_exception_type_check;

ALTER TABLE public.workforce_exceptions
  ADD CONSTRAINT workforce_exceptions_exception_type_check
  CHECK (exception_type IN (
    'late_start', 'early_leave', 'unscheduled_shift',
    'no_show', 'shift_extended', 'overtime', 'absence'
  ));
```

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Add `'absence'` to the `exception_type` check constraint |

One migration, zero code changes.

