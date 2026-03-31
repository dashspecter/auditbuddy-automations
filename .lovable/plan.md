

# Fix: Mobile Error + Desktop "removeChild" Flash

## Root Cause Analysis

Two distinct bugs traced through the full boot flow:

### Flow

```text
index.html loads
  ├─ Inline script: MutationObserver watches #root, shows boot-fallback after 1.2s
  ├─ build-bootstrap-v3.js (deferred):
  │     1. ensureLatestVersion() → fetches version.json + build-manifest.json
  │     2. clearAllCaches() ← runs on EVERY boot, even when no mismatch
  │     3. fetchManifestEntry() ← fetches build-manifest.json AGAIN (2nd time)
  │     4. injectModuleScript() → appends <script> to body
  │     5. If manifest fails → fallback: injectModuleScript("/src/main.tsx") ← BROKEN
  │
  └─ main.tsx loads:
        1. document.getElementById("boot-fallback")?.remove() ← removes node
        2. createRoot(#root).render(<App />)
        3. MutationObserver fires, tries to hide already-removed boot-fallback
```

### Bug 1: Mobile — "The object can not be found here"
When `fetchManifestEntry()` fails on mobile (slow network, timeout), the bootstrap falls back to injecting `/src/main.tsx` (line 204). **This file doesn't exist in production** — Vite compiles it into hashed chunks. The 404 error propagates to the `ErrorBoundary`.

### Bug 2: Desktop — "Failed to execute 'removeChild'"
The `clearAllCaches()` call on line 190 runs on **every single page load**, clearing any in-flight cache/SW state. Combined with `main.tsx` removing `boot-fallback` from the DOM while the MutationObserver is still watching `#root`, React's Suspense boundary encounters a DOM state mismatch during lazy component resolution, causing the `removeChild` error. The 2-second delay in `RouteErrorBoundary` isn't enough because this error is caught by the top-level `ErrorBoundary` instead.

## Fix Strategy

### 1. `public/build-bootstrap-v3.js` — Fix broken fallback + remove redundant work

- **Remove the `/src/main.tsx` fallback** — in production this file doesn't exist. Instead, if manifest fetch fails, retry once, then show the boot-fallback with reload/reset buttons (already exists in HTML).
- **Remove unconditional `clearAllCaches()`** on line 190 — only clear caches during an actual version mismatch (already done inside `ensureLatestVersion`). Running it on every boot is disruptive and causes race conditions with lazy chunk loading.
- **Remove duplicate `fetchManifestEntry()` call** — the manifest is already fetched inside `ensureLatestVersion()`. Cache the result and reuse it in `boot()`.

### 2. `index.html` — Fix MutationObserver race

- In the inline script, check if `boot-fallback` still exists before trying to hide it (defensive null check)
- This prevents any edge case where the observer fires after `main.tsx` has already removed the element

### 3. `src/main.tsx` — Safer boot-fallback removal

- Instead of `element.remove()`, use `element.style.display = 'none'` to hide it, then remove it after React has mounted (via `requestIdleCallback` or `setTimeout`). This prevents DOM conflicts with the MutationObserver.

### 4. `src/components/ErrorBoundary.tsx` — Add delay like RouteErrorBoundary

- Add the same 2-second delay mechanism from `RouteErrorBoundary` to the top-level `ErrorBoundary`. The "removeChild" error is transient — if we delay showing the error UI, the app has time to recover via `lazyWithRetry`.

## Files

| File | Change |
|------|--------|
| `public/build-bootstrap-v3.js` | Remove `/src/main.tsx` fallback (show boot-fallback instead), remove unconditional `clearAllCaches()`, deduplicate manifest fetch |
| `index.html` | Add null check in MutationObserver callback |
| `src/main.tsx` | Hide boot-fallback instead of removing it, defer actual removal |
| `src/components/ErrorBoundary.tsx` | Add 2-second delay before showing error UI (same pattern as RouteErrorBoundary) |

## Result
- Mobile: If manifest fails, users see the existing boot-fallback spinner with Reload/Reset buttons instead of a cryptic error
- Desktop: No more "removeChild" flash — transient errors are absorbed by the delayed ErrorBoundary
- No more unnecessary cache clearing on every page load

