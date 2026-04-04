
Do I know what the issue is? Yes.

## What is actually broken
The mobile/web sign-in screen is not the problem. The problem is the employee is linked to the wrong authentication account.

I verified this mismatch:
- employee record: `Grecea Alexandru` / `alex@email.com`
- linked login account: older account whose real login email is `alex@grecea.work`

So when you try to sign in with `alex@email.com`, the auth layer rejects it before the staff flow even starts. That is why you get “Invalid email or password”.

## Why this happened
Current flow:
```text
EmployeeDialog
  -> creates employee row
  -> calls create-user
  -> create-user may link an existing account instead of creating a fresh one
  -> UI always shows a success toast
```

Two bugs combine here:

1. `supabase/functions/create-user/index.ts`
- the employee-login branch can reuse/link an existing account
- it does not fully guarantee that the linked account email matches the employee email
- if it links an existing account, the typed password is not reliably the password that will work for that account

2. `src/components/EmployeeDialog.tsx`
- it treats every successful response as “login credentials created”
- it does not distinguish:
  - new account created
  - existing account linked
  - mismatched/legacy link situation

I also found multiple historical employee/auth email mismatches, so this is a real flow-hardening issue, not just a mobile glitch.

## Safest fix
### 1. Repair only the broken Grecea Alexandru link
Do a targeted backend/data repair for this one employee:
- detach the wrong linked account from this employee
- keep the old `alex@grecea.work` account untouched
- relink/create the correct login account for `alex@email.com`

This must be targeted to this employee only, not a broad cleanup.

### 2. Harden `supabase/functions/create-user/index.ts`
Only change the employee-account branch.

Add safeguards:
- fetch the employee first, including current `user_id`
- if the employee is already linked, verify the linked auth email matches the requested employee email
- if emails do not match, do not silently treat the link as valid
- if no auth account exists for the requested email, create one with the requested password
- if an auth account already exists for that exact email and is safe to reuse, link it explicitly and apply/update the password so the entered password actually works
- return structured flags such as:
  - `createdNew`
  - `linkedExisting`
  - `repairedMismatch`
  - `loginEmail`

### 3. Fix `src/components/EmployeeDialog.tsx`
Keep the current UI flow, but make the response handling truthful:
- inspect the backend flags instead of assuming every success means “new login created”
- show accurate toasts:
  - new account created
  - existing account linked
  - mismatch repaired
  - email conflict / wrong linked account
- keep the current employee query invalidation exactly as-is

## What I will NOT change
- no auth bootstrap changes
- no login page rewrite
- no routing changes
- no permission-model changes
- no company invitation flow changes
- no broad database rewrite

## Files involved
- `supabase/functions/create-user/index.ts`
- `src/components/EmployeeDialog.tsx`
- one targeted backend/data correction for Grecea Alexandru’s employee row

## Expected result
- `alex@email.com` becomes the real login identity for Grecea Alexandru
- the password set during employee account creation works as expected
- future employee creations cannot silently attach the wrong existing account while still showing a fake success message
