
You’re right to push for inspection — I reviewed the current code path, and there are 3 concrete reasons this is still showing the old view.

1) Root route bypasses the redirect logic  
- In `src/App.tsx`, `/` is mapped to `LandingNFX`, not `Index`.
- Your mobile owner/admin redirect logic exists in `Index.tsx`, so it never runs when users open the app at `/`.

2) Auth redirect fires before company role is loaded  
- In `src/pages/Auth.tsx`, redirect runs as soon as `user` + `staffCheckComplete` are true.
- `company?.userRole` is often still undefined at that moment.
- That evaluates `isOwnerOrAdmin = false`, so it sends users to `/dashboard`.

3) Landing page “Dashboard” button is hardcoded to old destination  
- In `src/pages/LandingNFX.tsx`, logged-in users get `dashboardPath = isStaff ? "/staff" : "/dashboard"`.
- No mobile owner/admin condition exists there, so even from landing they still go to dashboard.

What I also verified
- Alex is correctly `company_owner` in data, so this is not a role-data issue.
- Route exists as `/command` (with two m’s). (`/comand` won’t match.)

Implementation plan to fix safely (no scope creep)
A) Make root authenticated entry deterministic
- In `App.tsx`, change `/` from `LandingNFX` to `Index` (or use a wrapper that chooses `Index` if logged in, `LandingNFX` if not).
- Keep `/go` (or similar) for always-show marketing page.

B) Fix auth redirect timing
- In `Auth.tsx`, gate redirect until company role is resolved for non-staff users:
  - wait for `useCompany().isLoading === false` before computing owner/admin target
  - then redirect to `/command` for mobile owner/admin, else existing targets.

C) Align landing CTA with same routing rule
- In `LandingNFX.tsx`, compute the same target logic used elsewhere:
  - staff -> `/staff`
  - mobile + owner/admin -> `/command`
  - else -> `/dashboard`
- This prevents mismatch when users navigate from landing while logged in.

D) Keep everything else untouched
- No DB changes
- No RLS changes
- No permission model changes
- No changes for staff/member/desktop flows

Validation checklist (targeted)
1. Mobile + owner/admin login from `/auth` -> lands on `/command`
2. Mobile + owner/admin opening app at `/` while already logged in -> lands on `/command`
3. Mobile + staff -> `/staff` unchanged
4. Desktop + owner/admin -> `/dashboard` unchanged
5. Landing “Dashboard” button routes correctly per role + device
6. PWA cold start and browser cold start both follow same behavior
