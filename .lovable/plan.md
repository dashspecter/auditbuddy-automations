

# Bug: Task Edit Form Wipes `start_at` on Save

## Root Cause
In `TaskEdit.tsx`, the `handleSubmit` function (line 163) always sends `start_at` in the update payload:
```typescript
start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null
```

When a user opens any task for editing — even just to change roles or locations — and hits Save, if the `start_at` field is empty in the form (or wasn't touched), it sends `null` to the database, **overwriting** the existing value.

The DB confirms this: ~10 LBFC Amzei tasks were updated on Feb 26 between 11:16-13:30, all now have `start_at: NULL`.

## Fix

### 1. `TaskEdit.tsx` — Only send `start_at` if the user explicitly changed it
Track whether `start_at` was modified by the user. If untouched, omit it from the update payload entirely so the existing DB value is preserved.

**Approach**: Add a `dirtyFields` tracker or compare the submitted value against the initial value. If `start_at` hasn't changed from its initial load value, don't include it in the mutation payload.

Concretely:
- Store the initial `start_at` value when the form loads (line 125)
- In `handleSubmit`, only include `start_at` in the update if the value differs from the initial
- This prevents accidental nullification when users edit unrelated fields

### 2. Restore the lost data
Run a query to identify tasks that lost their `start_at` on Feb 26. Unfortunately, unless there's an audit log or backup, the original values are gone. The user will need to re-enter the start times for the affected tasks.

**However**, we can at least flag which tasks lost data:
```sql
SELECT id, title, updated_at FROM tasks t
JOIN task_locations tl ON tl.task_id = t.id
JOIN locations l ON l.id = tl.location_id
WHERE l.name ILIKE '%Amzei%' AND t.start_at IS NULL
ORDER BY t.updated_at DESC
```

## Files Changed
- `src/pages/TaskEdit.tsx` — Track initial `start_at`, conditionally include in update payload

