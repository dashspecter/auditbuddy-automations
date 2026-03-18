

# Fix: Session Killed by Global signOut in Auth Handler

## Root Cause (why it happens after just 2 minutes)

`AuthContext.tsx` has **3 places** where `supabase.auth.signOut()` is called **without** `scope: 'local'`:

1. **Line 213** — inside `onAuthStateChange`: if a token refresh event produces a session without `refresh_token` (which Supabase JS v2 can do in edge cases), this fires `signOut()` globally → **revokes the server-side refresh token**
2. **Line 274** — inside `getSession()` error handler: same global signOut
3. **Line 284** — inside `getSession()` missing-refresh-token handler: same

Once ANY of these fire, the server token is dead. Then when `useAuditFieldResponses` tries to save (calling `refreshAndGetUser()` → `refreshSession()`), it fails → "Your session has expired."

**This is a race condition that can trigger within seconds of page load**, not just after inactivity.

## Secondary Issue

`PerformAudit.tsx` (the page used for "Site Visit Checklist") was never given `setSuppressInactivityLogout`. The previous fix only added it to `StaffLocationAudit.tsx`.

## Fixes

### Fix 1: AuthContext.tsx — Use `scope: 'local'` everywhere

Change all 3 bare `signOut()` calls to `signOut({ scope: 'local' })`:

- **Line 213**: `await supabase.auth.signOut({ scope: 'local' })` — inside onAuthStateChange
- **Line 274**: `await supabase.auth.signOut({ scope: 'local' })` — inside getSession error handler  
- **Line 284**: `await supabase.auth.signOut({ scope: 'local' })` — inside getSession missing-token handler

This prevents the global server-side token revocation cascade. If the session is truly invalid, the local cleanup is sufficient — subsequent API calls will fail naturally and the user gets redirected.

### Fix 2: PerformAudit.tsx — Add session suppression

Import `useAuth` and call `setSuppressInactivityLogout(true)` while the audit is active. This matches what was already done for `StaffLocationAudit.tsx`.

### Fix 3: Make `refreshAndGetUser()` more resilient

In `useAuditFieldResponses.ts` and `useAuditSectionResponses.ts`, change `refreshAndGetUser()` to try `getUser()` first, and only call `refreshSession()` if needed. This avoids unnecessary token churn:

```typescript
async function refreshAndGetUser() {
  // Try existing session first
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  
  // Only refresh if no user found
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw new Error(SESSION_EXPIRED_MSG);
  
  const { data: { user: refreshedUser } } = await supabase.auth.getUser();
  if (!refreshedUser) throw new Error("Not authenticated");
  return refreshedUser;
}
```

## Files to Change

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `scope: 'local'` to 3 bare `signOut()` calls (lines 213, 274, 284) |
| `src/pages/audits/PerformAudit.tsx` | Add `setSuppressInactivityLogout(true)` while audit is active |
| `src/hooks/useAuditFieldResponses.ts` | Make `refreshAndGetUser()` try `getUser()` first |
| `src/hooks/useAuditSectionResponses.ts` | Same resilient pattern for its `refreshSession` call |
| `src/hooks/useAuditsNew.ts` | Same resilient pattern |

