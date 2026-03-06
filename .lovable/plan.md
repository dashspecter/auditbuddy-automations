

# Replace Root Landing Page with LandingNFX

## What happened
The root path `/` renders `Landing.tsx` (old page with 4 generic cards). The newer marketing page `LandingNFX.tsx` only renders at `/go` and `/landing`. This has been the case since LandingNFX was created — no one changed anything.

## Fix
Swap the root landing page so unauthenticated visitors at `/` see `LandingNFX` instead of the old `Landing.tsx`.

### Changes
1. **`src/pages/Index.tsx`** — Import `LandingNFX` instead of `Landing` and render it for unauthenticated users
2. **`src/App.tsx`** — Keep `/go` and `/landing` routes pointing to `LandingNFX` for backward compatibility. Optionally keep a `/landing-old` route for the original `Landing.tsx` if you ever need it, or remove it entirely.

### No other impact
- Authenticated users are still redirected to `/staff`, `/command`, or `/dashboard` as before
- The `/go` URL continues to work

