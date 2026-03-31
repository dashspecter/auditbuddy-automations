

# Fix Mobile Blank Page and Desktop Error Flash

## Root Cause

I visited dashspect.com with the browser tool and confirmed the blank page. The console shows:

```
[Bootstrap] Version mismatch: URL=none → 1774941884856. Clearing caches...
```

The app has **three redundant version-checking/cache-busting systems** that fight each other, causing a multi-reload cycle that never completes on mobile:

1. **`build-bootstrap-v3.js`** — checks `version.json`, redirects to add `?v=` to URL, clears SW/caches
2. **`main.tsx` `checkBuildVersion()`** — does the exact same thing again after bootstrap already handled it
3. **VitePWA `registerSW.js`** — auto-registers a service worker, which bootstrap then finds and unregisters on the next session, triggering yet another reload

On every fresh session (no `?v=` in URL), the bootstrap redirects. After redirect, pre-clean finds the SW (registered by VitePWA), cleans it, reloads again. Then `main.tsx` may trigger a third redirect. On mobile, this 2-3 reload cycle results in a permanent blank page because the boot-fallback gets destroyed by each `window.location.replace()`.

The brief "Something went wrong" on desktop is the `RouteErrorBoundary` flashing during the redirect cycle when chunk imports fail momentarily.

## Fix Strategy

**Simplify to a single, reliable version check.** The bootstrap script alone is sufficient — remove all redundant checks.

### Changes

**1. `src/main.tsx` — Remove redundant `checkBuildVersion()` and SW cleanup**
- Delete the entire `checkBuildVersion()` function (lines 85-215) — bootstrap v3 already handles this
- Delete `cleanupServiceWorkersAndCaches()` (lines 24-46) — bootstrap v3 already does this
- Remove the calls to both functions in the boot sequence (lines 237-243)
- Keep `resetAppCacheIfRequested()` and `restoreDeepLinkIfNeeded()` (still useful)

**2. `src/main.tsx` — Remove `registerServiceWorker()` call**
- Delete the `registerServiceWorker()` call at line 253 and its import at line 3
- The VitePWA plugin's auto-generated `registerSW.js` should also be disabled (see #4)
- Service workers are the primary source of stale cache issues; removing them eliminates the problem

**3. `public/build-bootstrap-v3.js` — Stop redirecting with `?v=` param**
- The `?v=` URL redirect is unnecessary: `_headers` already sets `no-cache` on all HTML/JSON, and Vite hashes asset filenames
- Change `ensureLatestVersion()` to only compare build versions and reload (no URL redirect), using the existing `FORCE_RELOAD_KEY` guard to prevent loops
- This eliminates the visible URL change and one full redirect cycle

**4. `vite.config.ts` — Disable VitePWA entirely**
- Remove `VitePWA()` from plugins — it generates `registerSW.js` and `sw.js` which conflict with the anti-SW logic
- The `manifest.json` in `/public` still provides installability (Add to Home Screen) without a service worker

**5. `src/components/RouteErrorBoundary.tsx` — Add delay before showing error**
- Add a 2-second delay before rendering the error UI to give the bootstrap/retry cycle time to complete
- If the chunk-reload mechanism resolves the issue during the delay, the error never shows

## Files

| File | Change |
|------|--------|
| `src/main.tsx` | Remove `checkBuildVersion`, `cleanupServiceWorkersAndCaches`, `registerServiceWorker` — keep only `resetAppCacheIfRequested` and `restoreDeepLinkIfNeeded` |
| `public/build-bootstrap-v3.js` | Replace `?v=` URL redirect with simple reload-once on version mismatch |
| `vite.config.ts` | Remove `VitePWA()` plugin entirely |
| `src/lib/pwa.ts` | Keep file but remove SW registration; keep install prompt logic |
| `src/components/RouteErrorBoundary.tsx` | Add 2s delay before showing error UI |

## Result
- Mobile: App loads on first try (no redirect cycle)
- Desktop: No more "Something went wrong" flash
- Cache busting still works via build-manifest hash comparison in bootstrap
- App still installable via manifest.json (no SW needed for that)

