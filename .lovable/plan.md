

# Fix: "removeChild" Error on Homepage

## Root Cause

The recent refactor in App.tsx split routes into "lightweight public" (no providers) and "auth-aware" groups. The `/go` and `/landing` routes now render `LandingNFX` **without** `AuthProvider`:

```text
App.tsx line 328: <Route path="/go" element={<LandingNFX />} />   ← NO AuthProvider
App.tsx line 329: <Route path="/landing" element={<LandingNFX />} /> ← NO AuthProvider
```

But `LandingNFX.StickyNav` calls `useAuth()` (line 60) and `useCompany()` (which also calls `useAuth()` internally). Both throw when there's no `AuthProvider` ancestor. React crashes mid-render, can't clean up the partially-committed DOM (the navbar), and throws the secondary "removeChild" error.

The same crash can occur on `/` during initial load if there's a timing edge case with the provider chain.

## Fix — Two Changes

### 1. Wrap `/go` and `/landing` routes with `AuthProvider`

In `App.tsx`, move the `/go`, `/landing`, `/full-presentation`, `/full`, and `/sales-offer` routes into the auth-aware section, OR wrap them individually with `AuthProvider`. Since `LandingNFX` needs auth context to show "Sign In" vs user avatar, it must have `AuthProvider`.

### 2. Make `LandingNFX.StickyNav` resilient to missing auth (defense in depth)

Change `StickyNav` to use a try/catch or optional context pattern so it gracefully defaults to "anonymous" mode if `AuthProvider` is somehow missing. This prevents any future routing mistake from crashing the entire page.

## Files

| File | Change |
|------|--------|
| `src/App.tsx` | Move `/go`, `/landing` routes inside `AuthProvider` wrapper (or add individual `AuthProvider` wrappers) |
| `src/pages/LandingNFX.tsx` | Make `StickyNav` resilient to missing `AuthProvider` — catch the throw and default to anonymous state |

## Result
- No more "removeChild" crash on any landing route
- Landing page shows correctly for anonymous visitors
- No other files or flows affected

