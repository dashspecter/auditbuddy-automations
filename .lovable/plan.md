

# Fix: Brief "Something Went Wrong" Flash on Site Load

## Root Cause

When a new version is deployed, the JS chunk filenames change (Vite adds content hashes). Users who have the old `index.html` cached (by the service worker or browser cache) try to load chunk files that no longer exist on the server. The dynamic `import()` fails with a network/404 error, and `RouteErrorBoundary` catches it, briefly showing "Something went wrong."

This is a well-known issue with lazy-loaded SPAs after deployments.

## Solution

Two changes to make it self-healing:

### 1. Add a retry wrapper for lazy imports (`src/lib/lazyWithRetry.ts`)
Create a utility that wraps `React.lazy()` to catch chunk load errors and automatically reload the page once (using a sessionStorage flag to prevent infinite reload loops).

```text
lazy(() => import("./pages/Index"))
  ↓ becomes ↓
lazyWithRetry(() => import("./pages/Index"))
```

If the import fails:
- Check sessionStorage for a `chunk-reload` flag
- If not set: set the flag, call `window.location.reload()` (fetches fresh index.html with correct chunk URLs)
- If already set: clear the flag, let the error propagate to the error boundary (genuine error, not a stale chunk)

### 2. Update `src/App.tsx` — replace `lazy()` with `lazyWithRetry()`
Change all ~100 `lazy(() => import(...))` calls to use the new wrapper.

### 3. Improve `RouteErrorBoundary` — auto-recover for chunk errors
Add detection for chunk load errors (message contains "Failed to fetch dynamically imported module" or "Loading chunk") and auto-reload instead of showing the error UI.

## Files

| File | Change |
|------|--------|
| `src/lib/lazyWithRetry.ts` | **New** — retry wrapper for dynamic imports |
| `src/App.tsx` | Replace `lazy()` with `lazyWithRetry()` on all imports |
| `src/components/RouteErrorBoundary.tsx` | Add chunk error detection with auto-reload fallback |

## Result
Users will never see the "Something went wrong" flash after a deployment. The page silently reloads once to fetch the correct chunks.

