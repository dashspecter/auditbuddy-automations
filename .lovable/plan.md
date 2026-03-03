

# Mobile Command Center — Implementation Plan

## Scope

Build a read-only, mobile-optimized operational dashboard at `/command` that becomes the **default landing page** for company owners and admins on mobile devices. Zero changes to existing routes, components, or permissions for other roles.

## Access Control

- **Who sees it**: `company_owner` and `company_admin` (from `useCompany().userRole`) on mobile viewport (<768px)
- **Who does NOT see it**: managers, checkers, HR, staff, members — their flows remain 100% unchanged
- **Desktop**: owners/admins still land on `/dashboard` as usual
- **Escape hatch**: "Go to Full Dashboard" link at the top for when they want the desktop view on mobile

## Routing Changes (2 files, minimal edits)

### `src/pages/Index.tsx` (line 83)
Currently: `isStaff ? "/staff" : "/dashboard"`
Change to: `isStaff ? "/staff" : (isMobile && isOwnerOrAdmin) ? "/command" : "/dashboard"`
- Uses existing `useIsMobile()` hook
- `isOwnerOrAdmin` derived from `useCompany().userRole` (already available via `useCompanyContext`)

### `src/pages/Auth.tsx` (line 52)
Currently: `isStaff ? "/staff" : "/dashboard"`
Same conditional added for mobile owner/admin detection.

### `src/App.tsx`
Add one route: `<Route path="/command" element={<ProtectedRoute><MobileCommand /></ProtectedRoute>} />`
Uses existing `ProtectedRoute` — no new route guard needed. The page itself checks `userRole` and redirects non-owner/admin users to `/dashboard`.

## New Files (~8 files)

| File | Purpose |
|---|---|
| `src/pages/MobileCommand.tsx` | Main page — standalone layout, no sidebar |
| `src/hooks/useMobileCommandData.ts` | Aggregates all data queries |
| `src/components/mobile-command/CommandHeader.tsx` | Greeting, date, read-only badge, dashboard link |
| `src/components/mobile-command/LiveWorkforceSection.tsx` | Currently clocked-in employees by location |
| `src/components/mobile-command/TodayAuditsSection.tsx` | Scheduled + completed audits today |
| `src/components/mobile-command/WeeklyAuditSummary.tsx` | Mon–today KPIs + negative highlights |
| `src/components/mobile-command/MonthlyNegativeSummary.tsx` | 30-day bullet-point attention items |

## Data Queries (all use existing tables + RLS)

1. **Live workforce**: `attendance_logs` where `check_out_at IS NULL` + today, joined with `employees` and `locations`
2. **Today's scheduled audits**: `location_audits` where `audit_date = today` and status = `scheduled`
3. **Today's completed audits**: `location_audits` where `audit_date = today` and status in completed states
4. **Weekly audits** (Mon–today): `location_audits` with scores, flag <70%
5. **30-day negatives**: `location_audits` with `overall_score < 70`, grouped by location
6. **Open corrective actions**: `corrective_actions` where status is open/in_progress, count overdue
7. **Late arrivals**: `attendance_logs` where `is_late = true` last 30 days, employees with >3 lates

All queries filter by `company_id` using existing patterns from `useCompanyContext`.

## What Does NOT Change

- Desktop dashboard flow — untouched
- Staff flow — untouched
- Manager/checker/HR/member flows — untouched
- Sidebar navigation — untouched
- RLS policies — no new ones needed
- Database — zero migrations
- Existing hooks — not modified, new hook created separately

## Mobile UX

- Full-width cards, 375px minimum, pull-to-refresh
- Collapsible weekly/monthly sections
- Loading skeletons per section (independent queries)
- Score colors: green >80%, amber 60-80%, red <60%
- No sidebar, no bottom nav — standalone layout with "Full Dashboard" escape link
- Auto-refresh on tab return via `useAppVisibility`

## Test Plan

After implementation:
1. Sign in as company owner on mobile — verify landing on `/command`
2. Sign in as company owner on desktop — verify landing on `/dashboard`
3. Sign in as staff — verify landing on `/staff` (unchanged)
4. Sign in as company member (e.g., Sonia) — verify landing on `/dashboard` (unchanged)
5. Verify each section renders with correct data or empty states
6. Test pull-to-refresh
7. Test "Go to Full Dashboard" link

