

# Phase B — Platform QA & Polish Pass

## What We're Building

Production hardening across the full platform: code-splitting for performance, mobile responsiveness fixes, consistent error boundaries, and database index optimization. This is not Dash-specific — it covers the entire application.

---

## Step 1 — Code Splitting (Critical Performance Win)

**Problem**: `App.tsx` eagerly imports 130+ page components. Every user downloads the entire app on first load regardless of which page they visit.

**Fix**: Convert all page imports to `React.lazy()` with a shared `Suspense` fallback.

- Create `src/components/LazyLoadFallback.tsx` — a simple centered spinner
- Replace all `import X from "./pages/X"` with `const X = React.lazy(() => import("./pages/X"))`
- Wrap the inner `<Routes>` block in `<Suspense fallback={<LazyLoadFallback />}>`
- Group related modules into natural chunks (CMMS, Scouts, Staff, Workforce, Waste, WhatsApp, Operations)

**Expected impact**: Initial bundle reduced by ~60-70%. Each page loads on-demand.

**File**: `src/App.tsx`, `src/components/LazyLoadFallback.tsx` (new)

---

## Step 2 — Consistent Error Boundaries Per Route Group

**Problem**: Only one top-level `ErrorBoundary` exists. A crash in any page takes down the entire app.

**Fix**: Add granular error boundaries around route groups.

- Create `src/components/RouteErrorBoundary.tsx` — lightweight version with "Go back" + "Reload" buttons, scoped to the content area (not full-page takeover)
- Wrap each lazy-loaded page in `<RouteErrorBoundary>` inside `App.tsx`
- Keeps the existing top-level `ErrorBoundary` as ultimate fallback

**File**: `src/components/RouteErrorBoundary.tsx` (new), `src/App.tsx`

---

## Step 3 — Mobile Responsiveness Fixes

**Problem**: Several pages use hardcoded widths, overflow issues, or don't account for the mobile bottom nav's height.

**Fixes**:
- Add `pb-20` (bottom padding) to `AppLayout.tsx` main content area when `isMobile` to prevent content hiding behind the 64px bottom nav
- Fix `MobileBottomNav.tsx` — add `safe-area-inset-bottom` padding for notched phones
- Audit the `AppTopBar.tsx` for overflow on small screens (truncate title, hide non-essential buttons)

**Files**: `src/components/layout/AppLayout.tsx`, `src/components/layout/MobileBottomNav.tsx`, `src/components/layout/AppTopBar.tsx`

---

## Step 4 — Database Index Optimization

**Problem**: High-traffic queries on `employees`, `audits`, `equipment`, `attendance_logs`, and `dash_action_log` lack composite indexes for common filter patterns.

**Fix**: Single migration adding indexes for the most common query patterns:

```sql
-- Attendance (filtered by company + date constantly)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_company_date 
  ON attendance_logs(company_id, clock_in_time DESC);

-- Employees (filtered by company + location)
CREATE INDEX IF NOT EXISTS idx_employees_company_location 
  ON employees(company_id, location_id) WHERE deleted_at IS NULL;

-- Audits (filtered by company + status + date)
CREATE INDEX IF NOT EXISTS idx_audits_company_status 
  ON audits(company_id, status, created_at DESC);

-- Dash action log (analytics queries)
CREATE INDEX IF NOT EXISTS idx_dash_action_log_company_created 
  ON dash_action_log(company_id, created_at DESC);

-- Dash sessions (user lookup)
CREATE INDEX IF NOT EXISTS idx_dash_sessions_user 
  ON dash_sessions(user_id, updated_at DESC);
```

**File**: Database migration

---

## Step 5 — Duplicate Route Cleanup

**Problem**: `App.tsx` has duplicate route definitions (e.g., `/workforce/payroll-batches`, `/workforce/attendance-alerts`, `/workforce/scheduling-insights` appear twice at lines 407-412 and 519-521).

**Fix**: Remove the duplicate entries at lines 519-521.

**File**: `src/App.tsx`

---

## Files Summary

| File | Action |
|------|--------|
| `src/App.tsx` | Lazy imports, Suspense wrapper, remove duplicate routes |
| `src/components/LazyLoadFallback.tsx` | New — loading spinner for lazy routes |
| `src/components/RouteErrorBoundary.tsx` | New — per-route error boundary |
| `src/components/layout/AppLayout.tsx` | Mobile bottom padding fix |
| `src/components/layout/MobileBottomNav.tsx` | Safe area inset |
| `src/components/layout/AppTopBar.tsx` | Mobile overflow fixes |
| Database migration | Composite indexes for high-traffic tables |

## Delivery Order

1. Code splitting + lazy loading (biggest performance win)
2. Duplicate route cleanup (quick fix, ships with step 1)
3. Mobile responsiveness fixes (UX)
4. Route-level error boundaries (resilience)
5. Database indexes (query performance)

