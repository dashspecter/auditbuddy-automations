

# Redesign Admin Dashboard + Fix Build Errors

## Overview
Two workstreams in one implementation: (1) redesign the dashboard top section with Yesterday/Today/7-Day layout and remove unwanted widgets, (2) fix the build-blocking TypeScript errors in edge functions.

## Part 1: Dashboard Redesign

### New Layout Order
```text
Header + Refresh + Badge
DashboardGreeting
DraftAudits
CompanySetupChecklist
AttentionAlertBar

── YESTERDAY'S RESULTS (section label) ──────────
5 cards in a row:
  Audit Score | Task Completion | Workforce Score | Open CAs | Attendance
  (all computed for yesterday only)

── TODAY (section label) ─────────────────────────
3 cards in a row:
  Expected Audits | Expected Tasks | Employees at Work
  (live counts for today)

── PAST 7 DAYS (section label) ──────────────────
Existing CrossModuleStatsRow (locked to last 7 days)

Declining Locations + Weakest Sections
WorkforceAnalytics (without top 5 cards)
Tasks + Corrective Actions
Maintenance
```

### Files to Create

**`src/components/dashboard/YesterdayResultsRow.tsx`** — New component
- Computes yesterday = `subDays(now, 1)`
- Reuses `useDashboardStats({ dateFrom: yesterday, dateTo: yesterday })` for audit score
- Reuses `useTaskStats()` filtered client-side to yesterday
- Reuses `usePerformanceLeaderboard(yesterdayStr, yesterdayStr)` for workforce score
- Reuses `useCorrectiveActions()` filtered to open CAs
- Reuses `useMvAttendanceStats(yesterdayStr, yesterdayStr)` for attendance
- Renders 5 `StatsCard` components in a responsive grid

**`src/components/dashboard/TodaySnapshotRow.tsx`** — New component
- Uses `useQuery` with direct Supabase count queries:
  - `location_audits` where `audit_date = today` → Expected Audits
  - `tasks` where `due_date = today` → Expected Tasks  
  - `attendance_logs` where `date = today` and `check_in is not null` → Employees at Work
- Renders 3 `StatsCard` components

### Files to Modify

**`src/components/dashboard/AdminDashboard.tsx`**
- Remove `DateRangeFilter` (no longer needed; each section has its own fixed range)
- Remove `WhatsAppStatsWidget` import and usage
- Add `YesterdayResultsRow` and `TodaySnapshotRow` above `CrossModuleStatsRow`
- Pass fixed 7-day range to `CrossModuleStatsRow`: `dateFrom={subWeeks(now,1)}` `dateTo={now}`
- Add section labels ("Yesterday's Results", "Today", "Past 7 Days") as simple headings
- Pass `showTopCards={false}` to `WorkforceAnalytics`
- Remove `dateFrom`/`dateTo` state since sections use fixed ranges

**`src/components/dashboard/WorkforceAnalytics.tsx`**
- Add `showTopCards?: boolean` prop (default `true`)
- When `false`, skip rendering the first grid (lines 157-234) containing: Active Staff, Avg Performance, Late Arrivals, Active Warnings, At Risk
- Keep Score Breakdown grid and Leaderboard intact

## Part 2: Fix Build Errors

**`supabase/functions/create-user/index.ts`** (lines 84, 183)
- Replace `getUserByEmail(email)` with `listUsers({ filter: \`email=eq.\${email}\` })` and pick `users[0]`
- This is the correct API for the Supabase admin client

**`supabase/functions/dash-command/capabilities/audits.ts`** (lines 611, 695)
**`supabase/functions/dash-command/capabilities/equipment.ts`** (lines 149, 219)
**`supabase/functions/dash-command/capabilities/inventory.ts`** (line 117)
- Change `checkCapabilityPermission(ctx, "create", "table_name")` → `checkCapabilityPermission({ action: "create", module: "table_name", ctx })`
- Update `.allowed` / `.reason` → check `.ok` property and use appropriate error fields from `CapabilityResult`

## Result
- Dashboard shows clear Yesterday / Today / 7-Day operational snapshots
- Removed: WhatsApp widget, 5 workforce top cards (Active Staff, Avg Performance, Late Arrivals, Active Warnings, At Risk)
- Build errors fixed, enabling successful deployment

