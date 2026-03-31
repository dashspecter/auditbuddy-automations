
## Deep-dive diagnosis

There are 2 concrete failures happening at the same time, plus 1 startup architecture problem making the blast radius bigger.

```text
Browser opens page
  -> index.html shows boot-fallback timer
  -> build-bootstrap-v3.js runs
     -> in preview/dev it asks for /build-manifest.json
     -> preview returns HTML, not JSON
     -> bootstrap never loads app
     -> user sees permanent Loading screen
     -> clicking "Reset app cache" nests resetApp URLs and can self-loop

Published site
  -> bootstrap loads app
  -> public homepage still boots full app shell
     (AuthProvider + CompanyProvider + SidebarProvider + PWA prompt)
  -> lazy Index route renders
  -> React crashes in the Index chunk (#321) and then DOM cleanup throws removeChild
  -> user sees the route/global error UI
```

## What is actually wrong

1. `public/build-bootstrap-v3.js` is not safe for preview/dev.
   - In preview, `/build-manifest.json` returns HTML, so the loader stalls on the boot fallback.
   - The reset button can generate recursive URLs like `/?resetApp=1&returnTo=/?resetApp=1...`.

2. The public homepage is booting too much application shell.
   - `/` currently runs through `AuthProvider`, `CompanyProvider`, `SidebarProvider`, `PWAInstallPrompt`, and nested routes.
   - For an anonymous landing page, that is unnecessary and makes startup fragile.

3. We still have manual DOM cleanup in `src/main.tsx`.
   - Hiding/removing `#boot-fallback` from React boot code is risky.
   - The `removeChild` error is consistent with the DOM being mutated outside React during the first render / error recovery window.

## Implementation plan

### 1) Make the bootstrap loader safe
Update `public/build-bootstrap-v3.js` to:
- detect preview/dev hosts and bypass manifest/version logic there
- directly load `/src/main.tsx` only in preview/dev
- keep manifest/version logic only for published builds
- add a one-time global guard so the app entry cannot be injected twice
- stop appending `?v=...` to hashed JS/CSS asset URLs
- keep cache clearing only for a real version mismatch

### 2) Fix the reset loop
Update the reset button flow in `index.html` and `src/main.tsx` so:
- existing `resetApp` and `returnTo` params are stripped before building a new reset URL
- `returnTo` always points to a clean internal path
- repeated taps on “Reset app cache” cannot create nested reset URLs

### 3) Stop mutating boot DOM from React startup
Simplify `src/main.tsx`:
- remove the deferred `bootFallback.remove()`
- do not manually delete siblings around `#root`
- let bootstrap / fallback visibility control happen outside React without DOM removal races

### 4) Split public routes from the protected app shell
Refactor `src/App.tsx` so public pages are lightweight:
- public routes (`/`, `/landing`, `/go`, `/full`, `/sales-offer`, `/auth`, password routes) should use only the providers they actually need
- protected routes should keep the full chain:
  `Auth -> Company -> Sidebar -> protected layout`
- move `PWAInstallPrompt` and other app-shell-only startup pieces out of the public homepage path

### 5) Remove public homepage dependency on `CompanyContext`
Refactor `src/pages/Index.tsx` so it does not call `useCompanyContext()` on the public route.
- derive paused/loading state from `useCompany()` only when a user exists
- keep anonymous visitors on the landing page without company/module shell dependencies

## Files to change

| File | Change |
|------|--------|
| `public/build-bootstrap-v3.js` | Add preview/dev bypass, single-inject guard, safer asset loading, keep version logic only for published builds |
| `index.html` | Fix reset button URL construction; keep fallback display logic simple |
| `src/main.tsx` | Remove manual fallback deletion / DOM mutation |
| `src/App.tsx` | Split public routes from protected shell/providers |
| `src/pages/Index.tsx` | Remove `useCompanyContext()` dependency from public homepage |

## Expected result

- Preview/editor stops getting stuck on the loading screen
- “Reset app cache” no longer traps users in recursive reset URLs
- Homepage loads without booting the full protected shell
- The React `#321` / `removeChild` crash path is eliminated from public startup
- Published site and mobile startup become stable again
