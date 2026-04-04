
Do I know what the issue is? Yes.

What I verified
- The main platform account still exists correctly: `alex@grecea.work` is present in the auth system, in `profiles`, and still has the expected `admin` + `company_owner` access.
- The login is failing before the app even boots into the protected area: auth logs show `/token` returning `400 Invalid login credentials`.
- So this is not a nav problem, not a route problem, and not an `AuthContext` bootstrap problem.
- The employee record for `Grecea Alexandru / alex@email.com` is currently detached again (`employees.user_id = null`), which means the bad employee link was removed, but the main account password was not restored and the employee login was not fully rebuilt.

What is actually broken
- The authoritative admin identity was not deleted.
- Its password is now out of sync with the password being used to sign in.
- The most likely cause is the earlier employee/auth mismatch path: the employee flow could point at the wrong auth user, and password/account actions could then mutate that wrong auth identity.

Safest fix
1. Recover the main platform account first
- Do a targeted backend password reset only for `alex@grecea.work`.
- Do not touch roles, company memberships, routes, or any app bootstrap logic.
- Verify that login works again immediately after the reset.

2. Finish the Grecea employee cleanup
- Keep `Grecea Alexandru / alex@email.com` separate from the admin account.
- Recreate/relink a dedicated login account for `alex@email.com` with its own password.
- Make sure it remains a normal employee login only.

3. Permanently block cross-account password resets
- `src/components/ResetPasswordDialog.tsx`: send `employeeId` together with `userId`.
- `supabase/functions/update-user/index.ts`: when `employeeId` is present, validate before changing password:
  - employee exists
  - `employees.user_id === userId`
  - linked auth email matches `employees.email`
- If any check fails, stop and return a precise mismatch error instead of updating anything.

4. Harden employee account creation/linking
- `supabase/functions/create-user/index.ts`
  - never silently reuse a mismatched auth account
  - only create/link against the exact requested email
  - replace the current password-update calls with the correct admin method on the exact user id
  - return explicit result states so the UI cannot claim success when the wrong identity was involved

5. Keep UI behavior stable
- `src/components/EmployeeDialog.tsx`: keep the current create flow and cache invalidation, only improve the backend outcome handling/messages.
- No changes to login page, auth bootstrap, routing, nav, permissions, or schema.

Files involved
- `supabase/functions/update-user/index.ts`
- `supabase/functions/create-user/index.ts`
- `src/components/ResetPasswordDialog.tsx`
- `src/components/EmployeeDialog.tsx`

Expected result
- The main platform account works again.
- `alex@email.com` becomes its own employee login.
- Future employee create/reset actions cannot accidentally change the owner/admin account password.
