

# Plan: Fix Long-Running Audit Session Stability

## Root Cause Analysis

There are **3 interconnected problems** causing the 2-hour "Site Visit Checklist" audit to fail:

### Problem 1: 30-minute inactivity timer kills the session (PRIMARY CAUSE)
`AuthContext.tsx` line 20: `SESSION_TIMEOUT = 30 * 60 * 1000` (30 minutes). The timer tracks `mousedown, keydown, scroll, touchstart, click`. But during a real site audit:
- The user locks their phone, walks around, inspects things, takes photos with the native camera
- None of these register as "activity" in the browser
- After 30 minutes, `handleInactivityLogout` fires → signs out → navigates to `/auth`
- On iOS, timers are frozen when backgrounded. When the user returns, the frozen 30-min timer fires **immediately**, signing them out before they can even see the page

This is the "Error: Your session has expired" the user sees in the screenshot.

### Problem 2: Can't sign back in immediately
After the forced logout, `supabase.auth.signOut({ scope: 'local' })` clears the local session. But:
- The `onAuthStateChange` handler (line 183) has a check: `if (session && !session.refresh_token)` → calls `supabase.auth.signOut()` **without** `scope: 'local'`. This can create a loop where the server-side session is invalidated
- The SW cache clearing on `SIGNED_IN` (line 204-207) can cause the app to reload from network, which on a slow mobile connection makes it feel like sign-in "isn't working"
- The user has to close and reopen the browser to get a clean state

### Problem 3: Draft data appears lost after re-login
The local draft (IndexedDB + localStorage) should persist across sign-out/sign-in. But the restoration logic has a flaw:
- `useAuditDraft` restores on mount by calling `findDraftsForUser(user.id)` and finding the most recent draft
- It restores `formData` including `customData` — but then `StaffLocationAudit.tsx` line 275 **resets `currentSectionIndex` to 0** when `selectedTemplateId` changes (the template load effect). This overwrites the restored section position
- More critically: the template load effect (line 233-279) runs AFTER draft restore and calls `setCurrentSectionIndex(0)`, wiping the restored position. The user sees section 1 with data, but thinks it's empty because they were on section 7

## Fix Plan

### Fix 1: Replace inactivity timer with audit-aware session management
**File**: `src/contexts/AuthContext.tsx`

- Increase `SESSION_TIMEOUT` from 30 minutes to **4 hours** (matches the longest audit duration with buffer)
- Add a `suppressInactivityLogout` context value that audit pages can set to `true` to completely disable the timer while an audit is in progress
- When `suppressInactivityLogout` is true, rely solely on the Supabase JWT refresh mechanism (which handles token expiry automatically via `autoRefreshToken: true` in the client config)

### Fix 2: Prevent frozen-timer instant-logout on iOS
**File**: `src/contexts/AuthContext.tsx`

- In `resetInactivityTimer`, before setting the new timeout, check `Date.now() - lastActivityRef.current`. If the gap is large (device was sleeping), **do not** fire logout — instead, reset the timer fresh. The user just touched the screen to wake the device, which IS activity
- Add `visibilitychange` listener: when the page becomes visible again, always reset the timer (user is back = active)

### Fix 3: Fix draft restoration being overwritten by template load
**File**: `src/pages/staff/StaffLocationAudit.tsx`

- In the template load effect (line 233-279), do NOT call `setCurrentSectionIndex(0)` if `isRestoring` is true or if the template ID matches the one being restored from draft
- Add a `restoredFromDraft` ref that prevents the template load effect from resetting the section index on the first load after draft restoration

### Fix 4: Add audit-page session suppression
**File**: `src/pages/staff/StaffLocationAudit.tsx`

- When the audit page mounts with an active template, set `suppressInactivityLogout(true)` via context
- On unmount or navigation away, set it back to `false`

## Files to Change

| File | What changes |
|------|-------------|
| `src/contexts/AuthContext.tsx` | Increase timeout to 4h; add `suppressInactivityLogout` context; fix frozen-timer-on-resume; reset timer on visibility change |
| `src/pages/staff/StaffLocationAudit.tsx` | Set `suppressInactivityLogout` while audit is active; fix section index reset after draft restore |

No database changes needed.

