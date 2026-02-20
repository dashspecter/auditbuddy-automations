

## Show Profile/Dashboard Link Instead of "Sign In" for Authenticated Users

### Problem
The landing page navbar always shows "Sign In" regardless of whether the user is logged in. When authenticated users see the landing page (e.g., navigating directly to `/`), they should see a way to go to their dashboard, not a sign-in button.

### Solution
Update the LandingNFX navbar to check authentication state and conditionally render:
- **Not signed in**: Show "Sign In" link (current behavior)
- **Signed in**: Show user avatar/initials with a "Go to Dashboard" link

### What Changes

**File: `src/pages/LandingNFX.tsx`**

1. Import `useAuth` from `@/contexts/AuthContext` and `Avatar`/`AvatarFallback` from the UI components
2. In the `Navbar` sub-component, call `useAuth()` to get the `user` object
3. Replace the static "Sign In" link in **three places** (desktop nav, mobile menu, and the bottom CTA section) with a conditional:
   - If `user` exists: render an avatar with initials + "Dashboard" link pointing to `/dashboard`
   - If no user: keep the current "Sign In" link

### Visual Result

**Before (signed in):** `Problem | How It Works | ... | Sign In | Book a Demo`

**After (signed in):** `Problem | How It Works | ... | [Avatar] Dashboard | Book a Demo`

### Technical Notes
- The `useAuth` hook is already available project-wide via `AuthProvider` wrapping the router
- No new components needed -- reuses existing `Avatar` / `AvatarFallback` from the UI library
- The `isStaff` flag from `useAuth` can optionally route staff users to `/staff` instead of `/dashboard`
- No database or backend changes required
