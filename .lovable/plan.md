
# Fix the remaining password-reset error

## What I verified
- The earlier global deploy/build blocker is no longer the active problem.
- The `update-user` backend is deployed and is being called successfully.
- Its logs show your request reaches the backend and passes permission checks.
- `src/components/ResetPasswordDialog.tsx` sends only `userId` and `password`.
- `supabase/functions/create-user/index.ts` already creates/updates the `profiles` row when a login account is created, so there should be no separate manual “create profile” step.

## Current flow
```text
Add employee
→ optional: create login account
→ backend creates/links auth user + upserts profile + stores employee.user_id
→ only then does Reset Password make sense
```

## Do I know what the issue is?
Yes. The current error is now a runtime failure inside `supabase/functions/update-user/index.ts` after authorization succeeds.

For the reset-password flow, the failing path is effectively:
```text
ResetPasswordDialog
→ update-user
→ auth.admin.updateUserById(userId, { password })
```

So this is not a dashboard issue, not a kiosk issue, and not a “missing profile creation step” issue. The real backend error is simply being hidden, which is why the UI only shows the generic non-2xx message.

## Minimal safe fix
1. **Harden `supabase/functions/update-user/index.ts` only**
   - validate `userId` and `password`
   - verify the target login account can be found before updating
   - wrap the password update in its own error handler
   - log the exact admin error before returning

2. **Return a specific backend error**
   - instead of generic 400s, return the real reason:
     - invalid payload
     - target login account cannot be updated
     - auth admin rejected the password update

3. **Tiny frontend improvement only**
   - in `src/components/ResetPasswordDialog.tsx`, surface the backend error message directly so the toast shows the actual reason instead of only “Edge Function returned a non-2xx status code”

## What I will not change
- no auth-provider changes
- no employee creation flow redesign
- no dashboard/kiosk/workforce logic
- no permission-model changes
- no unrelated edge functions

## Why this is the safest approach
- permission checks already work
- the request already reaches the backend
- `create-user` already handles profile upsert
- the bug is isolated to one backend password-update path

## Expected result
- password reset works again for valid linked employee accounts
- if a specific employee login link is invalid/incomplete, the app will say exactly why
- everything else on the platform stays untouched
