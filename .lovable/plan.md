
Do I know what the issue is? Yes.

What I verified
- The login screen is not the problem. `src/pages/Auth.tsx` uses direct email/password sign-in, so “Invalid email or password” is happening at the authentication layer before the app bootstrap, nav, routes, or permissions run.
- The master identity still exists correctly:
  - profile: `alex@grecea.work`
  - platform role: `admin`
  - company role: `company_owner`
- There is no employee row currently linked to that master account, so the account was not deleted or converted into staff.
- The Proper Pizza employee `Grecea Alexandru / alex@email.com` is currently detached (`employees.user_id = null`), which confirms the earlier bad link was removed but the master account password itself was not restored.
- I also found other historical employee/profile email mismatches, so this is a real flow-hardening issue, not just one bad record.

Actual root cause
- The master account still exists, but its password is out of sync.
- The risky path is still in `supabase/functions/create-user/index.ts`: when the employee-login flow finds an existing auth account, it can still call `auth.admin.updateUserById(..., { password })`.
- That means an employee “create login account” action can overwrite the password of an already-existing real account.
- There is also a legacy employee account creation path in `src/pages/EmployeeManagement.tsx` that still invokes `create-user` without a proper password flow, which keeps this area inconsistent.

Safest fix
1. Recover the master account first
- Do a targeted backend password reset only for `alex@grecea.work`.
- Do not touch roles, company memberships, nav, routes, or auth bootstrap.
- Verify login immediately after the reset.

2. Stop employee account creation from mutating existing real accounts
- File: `supabase/functions/create-user/index.ts`
- Keep using the entered password only when creating a brand-new auth account.
- If an exact existing auth account is found, do not automatically change its password inside the employee-create flow.
- Return explicit backend outcomes instead, such as:
  - `created_new`
  - `already_linked`
  - `linked_existing_password_unchanged`
  - `email_conflict`

3. Make the UI truthful
- File: `src/components/EmployeeDialog.tsx`
- Update toast/success handling so the UI no longer claims “login credentials created” when an existing account was only linked and its existing password was preserved.
- Keep the current employee query invalidation behavior.

4. Align the legacy employee-create path
- File: `src/pages/EmployeeManagement.tsx`
- Remove or align the old “create account” path that still calls `create-user` without a safe password flow.
- Reuse the same hardened behavior as the main employee dialog.

5. Keep password resets strict
- Keep `src/components/ResetPasswordDialog.tsx` and `supabase/functions/update-user/index.ts` as the dedicated password-change flow for employee-linked accounts, using the existing `employeeId` cross-check.
- No auth-page rewrite, no schema changes, no broad data cleanup.

What I will not change
- no login page rewrite
- no `AuthContext` changes
- no routing/nav changes
- no role changes
- no company membership changes
- no broad database migration or bulk relinking

Files involved
- `supabase/functions/create-user/index.ts`
- `src/components/EmployeeDialog.tsx`
- `src/pages/EmployeeManagement.tsx`
- one targeted backend password recovery for `alex@grecea.work`

Expected result
- `alex@grecea.work` works again
- future employee login creation cannot silently overwrite an existing real account password
- employee account creation messages become accurate
- the rest of the platform stays untouched
