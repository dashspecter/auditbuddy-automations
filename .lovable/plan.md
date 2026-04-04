

# Fix Employee Creation Error + Build Error

## Problem 1: Employee creation fails with "invalid input syntax for type uuid"

**Root cause**: The `employees` table has `location_id uuid NOT NULL` and `role text NOT NULL`. When the user doesn't select a location or role, the form sends `location_id: ""` and `role: ""` to the database. An empty string `""` is not a valid UUID, causing the Postgres error.

**Fix in `src/components/EmployeeDialog.tsx`** (~line 233-240 in `handleSubmit`):
- Add validation at the top of `handleSubmit`: if `formData.full_name` is empty, or `formData.location_id` is empty, or `formData.role` is empty, show a toast error ("Full name, location, and role are required") and return early
- This prevents the invalid empty-string UUID from ever reaching the database

## Problem 2: Build errors in `workforce.test.ts`

**Root cause**: The mock `chainable()` function doesn't have a `data` property, but the tests destructure `{ data: empData }` from the result. The mock needs to make the chain thenable and resolve to `{ data: result }`.

**Fix in `supabase/functions/dash-command/capabilities/workforce.test.ts`** (~line 16-30):
- Add a proper `.then` method to `chainable` so that when awaited, it resolves to `{ data: result, error: null }` instead of the raw chainable object
- Change `then: undefined` to a real `.then` implementation: `then: (resolve: any) => Promise.resolve({ data: result, error: null }).then(resolve)`

## What does NOT change
- No database schema changes
- No hook changes
- No auth/routing/permission changes
- No other components modified

## Result
- Employee creation shows a clear validation message when location/role are missing
- Build errors in workforce.test.ts resolved
- Everything else untouched

