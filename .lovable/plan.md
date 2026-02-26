

# Phase 3: Analytics Dashboards, Scout Notifications, PWA, and Admin Panel Enhancements

## Summary

This phase addresses four areas: (1) Scout-specific analytics dashboards for both Core and Scout Portal, (2) notification/alert integrations for scout job lifecycle events, (3) PWA setup using `vite-plugin-pwa` (already installed but not configured), and (4) expanding the Platform Admin panel with cross-company scout oversight. All changes are additive safe layers -- no existing pages are modified beyond appending routes/nav items.

---

## A. Scout Analytics Dashboards

### A1. Core Module: Scouts Analytics Page

**New page:** `src/pages/scouts/ScoutsAnalytics.tsx` at `/scouts/analytics`

Widgets:
- **KPI Cards:** Total Jobs Posted, Acceptance Rate, Avg Completion Time, Avg Scout Rating, Dispute Rate
- **Jobs Funnel Chart:** Posted -> Accepted -> Submitted -> Approved/Rejected (bar chart)
- **Completion Trend:** Line chart of jobs completed per week over last 12 weeks
- **Location Heatmap Table:** Jobs per location with pass/fail rates
- **Scout Leaderboard:** Top 10 scouts by reliability score (company-scoped -- only scouts who worked on this company's jobs)
- **Payout Summary:** Total paid vs pending, monthly trend

**Data source:** Direct queries on `scout_jobs`, `scout_submissions`, `scout_payouts`, `scouts` tables scoped to company. No materialized views needed initially -- volume is low compared to audits.

**New hook:** `src/hooks/useScoutAnalytics.ts` -- 3-4 React Query hooks aggregating scout data with date range filtering.

### A2. Scout Portal: Scout Performance Page

**New page:** `src/pages/scout-portal/ScoutPerformance.tsx` at `/performance`

Widgets:
- **My Stats Cards:** Jobs Completed, On-Time Rate, Approval Rate, Total Earned
- **Monthly Earnings Chart:** Bar chart of last 6 months
- **Job History Timeline:** Recent 20 jobs with status badges

**New hook:** `src/hooks/useScoutPerformance.ts` -- queries scoped to current scout's user_id.

### A3. Navigation Updates

- Add `scouts-analytics` sub-item to scouts nav in `navigation.ts`
- Add `/performance` route to Scout Portal router

---

## B. Scout Notifications & Alerts

### B1. Database: `scout_notifications` Table

New table for scout-specific notifications (separate from the company `notifications` table):

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| scout_id | uuid FK scouts | |
| job_id | uuid FK scout_jobs (nullable) | |
| type | text | `job_available`, `job_approved`, `job_rejected`, `payout_sent`, `dispute_update` |
| title | text | |
| message | text | |
| is_read | boolean default false | |
| created_at | timestamptz | |

RLS: scouts SELECT/UPDATE own notifications only.

### B2. Edge Function: `scout-notify`

Centralised notification dispatcher called from other edge functions or triggered by DB triggers:
- Inserts into `scout_notifications`
- (Future-ready: can add WhatsApp/email dispatch here)

### B3. DB Triggers for Auto-Notifications

Trigger functions that fire `scout-notify` on:
- `scout_jobs` status change to `posted` (notify eligible scouts in matching zones)
- `scout_submissions` status change to `approved`/`rejected` (notify assigned scout)
- `scout_payouts` status change to `paid` (notify scout)
- `scout_disputes` status change (notify scout)

### B4. Scout Portal: Notification Bell

- **New component:** `src/components/scout-portal/ScoutNotificationBell.tsx`
- Integrated into `ScoutPortalLayout.tsx` header
- **New hook:** `src/hooks/useScoutNotifications.ts` -- fetches unread count + list, mark-as-read mutation
- Realtime subscription on `scout_notifications` table for live badge updates

---

## C. PWA Setup

The project already has `vite-plugin-pwa` and `workbox-window` installed, `manifest.json` in `/public`, and PWA meta tags in `index.html`. What is missing: the VitePWA plugin is NOT configured in `vite.config.ts`.

### C1. Configure VitePWA in `vite.config.ts`

```typescript
import { VitePWA } from 'vite-plugin-pwa';

// Add to plugins array:
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/~oauth/],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'supabase-api', expiration: { maxEntries: 50, maxAgeSeconds: 300 } }
      }
    ]
  },
  manifest: false, // use existing /public/manifest.json
  devOptions: { enabled: false }
})
```

### C2. Service Worker Registration

- **New file:** `src/lib/pwa.ts` -- registers service worker, listens for updates, shows toast on new version
- Call from `main.tsx` after app mount

### C3. Install Prompt Page

- **New page:** `src/pages/InstallApp.tsx` at `/install`
- Detects platform (iOS/Android/Desktop) and shows platform-specific install instructions
- Captures `beforeinstallprompt` event for Chrome/Android native install button
- Add to navigation as a settings item

### C4. Offline Indicator

- **New component:** `src/components/OfflineIndicator.tsx`
- Shows a subtle banner when `navigator.onLine` is false
- Add to `AppLayout.tsx` and `ScoutPortalLayout.tsx`

---

## D. Platform Admin Panel Enhancements

The existing `PlatformAdmin.tsx` has tabs for Pending Approvals, Companies, Platform Admins, and AI Testing. This phase adds scout oversight capabilities.

### D1. New Tab: Scout Operations

Add to `PlatformAdmin.tsx` Tabs:
- **Scout Operations tab** with:
  - Total scouts across all companies (count query)
  - Active jobs across all companies
  - Dispute queue (all open disputes, filterable by company)
  - Scout approval queue (scouts with status='pending')

### D2. New Tab: Platform Analytics

Add to `PlatformAdmin.tsx` Tabs:
- **Platform Analytics tab** with:
  - Total companies, users, audits across platform
  - Scout module adoption (companies with scouts module active)
  - Monthly growth trend (new companies per month)
  - Module usage breakdown (most/least activated modules)

### D3. Company Detail Drill-Down

- **New page:** `src/pages/admin/CompanyDetail.tsx` at `/admin/companies/:id`
- Shows: company info, active modules, user count, audit count, scout jobs, recent activity
- Linked from the Companies tab via a "View" button

---

## Technical Details

### Files to Create (~15 new files)

```text
src/pages/scouts/ScoutsAnalytics.tsx
src/hooks/useScoutAnalytics.ts
src/pages/scout-portal/ScoutPerformance.tsx
src/hooks/useScoutPerformance.ts
src/hooks/useScoutNotifications.ts
src/components/scout-portal/ScoutNotificationBell.tsx
src/lib/pwa.ts
src/pages/InstallApp.tsx
src/components/OfflineIndicator.tsx
src/pages/admin/CompanyDetail.tsx
supabase/functions/scout-notify/index.ts
```

### Files to Modify (~6 files, additive only)

| File | Change |
|------|--------|
| `vite.config.ts` | Add VitePWA plugin |
| `src/main.tsx` | Import and call PWA registration |
| `src/App.tsx` | Add routes: `/scouts/analytics`, `/install`, `/admin/companies/:id`, scout portal `/performance` |
| `src/config/navigation.ts` | Add `scouts-analytics` sub-item, `install-app` settings item |
| `src/pages/scout-portal/ScoutPortalLayout.tsx` | Add ScoutNotificationBell + OfflineIndicator |
| `src/components/layout/AppLayout.tsx` | Add OfflineIndicator |
| `src/pages/PlatformAdmin.tsx` | Add Scout Operations + Platform Analytics tabs |
| `supabase/config.toml` | Add scout-notify function config |

### Database Migration

1. Create `scout_notifications` table with RLS
2. Create trigger functions for auto-notifications on scout_jobs/submissions/payouts/disputes status changes
3. Enable realtime on `scout_notifications`

### What is NOT Changed

- Existing notification system (company `notifications` table) -- untouched
- Mystery Shopper -- untouched
- Existing dashboard widgets -- untouched
- Existing analytics pages (Insights, NotificationAnalytics) -- untouched

### Implementation Batches

**Batch 1:** PWA setup (VitePWA config, service worker registration, install page, offline indicator)

**Batch 2:** Scout notifications (table + RLS, triggers, scout-notify edge function, notification bell component + hook)

**Batch 3:** Scout analytics (Core analytics page + hook, Scout Portal performance page + hook, nav updates)

**Batch 4:** Platform Admin enhancements (Scout Operations tab, Platform Analytics tab, Company Detail page)

