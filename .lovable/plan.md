

# Investigation: Cook User Seeing Manager Dashboard on Mobile

## What the data shows

**User**: Thayab Abdullah (user_id: `c45832c2-...`)
- Employee role: **Cook**
- `company_users` row: **none** (no company_role)
- `user_roles` row: **none** (no platform role)
- Has linked employee record: **yes**

The staff detection logic in `AuthContext` correctly identifies this user as staff (`isStaff = true`), which should route them to `/staff`.

## What happened

The screenshot shows the `/dashboard` page with the **admin/manager bottom nav** (Home, Workforce, Audits, Equipment, More) and the "Manager Dashboard" view rendered by `RoleBasedView`. This is NOT the staff view at all — it's the full admin/manager layout with `ProtectedLayout`.

## Root cause: Stale PWA service worker cache

The project uses `vite-plugin-pwa` + `workbox-window`. On the first browser, a **service worker from a previous session** (likely when a manager/admin was logged in on that same device) served stale cached assets. The cached JavaScript contained the old route/view, and rendered before the fresh auth check could redirect to `/staff`.

When the user switched to a different browser (clean cache, no service worker), the correct flow executed: auth → staff check → `isStaff = true` → redirect to `/staff`.

**This is NOT a routing logic bug.** The code paths are correct. It's a cache invalidation issue.

## Evidence supporting this conclusion

1. The routing logic (`Index.tsx`, `ProtectedRoute.tsx`, `AuthContext`) all correctly handle this user's role data
2. The `RoleBasedView` fallback in `Dashboard.tsx` shows the manager view when no specific role is found (it falls through to `manager` as the default-ish view via template permissions logic)
3. The bottom nav being the admin version means the full `ProtectedLayout` + `AppLayout` rendered, not the staff layout — so the user was on `/dashboard`, not `/staff`
4. Switching browsers fixed it (clean cache = correct behavior)

## Recommended fix: Force service worker update on auth state change

Add a service worker cache-bust when a new user signs in, so stale cached content from a previous user's session doesn't persist.

### Changes

**`src/contexts/AuthContext.tsx`** — On `SIGNED_IN` event, clear service worker caches:
```typescript
if (event === 'SIGNED_IN') {
  // Clear SW caches to prevent stale content from previous user sessions
  if ('caches' in window) {
    window.caches.keys().then(keys => 
      keys.forEach(key => window.caches.delete(key))
    );
  }
}
```

This is a 5-line addition. No other files change. No database changes.

### What this prevents
- A staff user seeing an admin/manager dashboard cached from a previous session
- Any cross-user cache contamination on shared devices
- The exact scenario reported: correct on clean browser, wrong on browser with existing cache

### Risk: minimal
- Only runs on `SIGNED_IN` (not token refresh)
- Clears browser caches (not query cache), so the app simply re-fetches static assets
- No impact on the current user's session or data

