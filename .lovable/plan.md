

## Replace Manager Dashboard with Admin Dashboard View

### Problem
The Manager Dashboard currently shows a legacy view with old-style components (CompliancePieChart, LocationTrendAnalysis, SectionPerformanceTrends, individual StatsCards). The Admin Dashboard has the newer "Actionable Intelligence Hub" with cross-module KPIs, attention alerts, declining locations, weakest sections, workforce analytics, tasks, corrective actions, and WhatsApp stats -- which is far more useful for managers too.

### Fix

**File: `src/components/dashboard/ManagerDashboard.tsx`**

Replace the entire component body to simply render the `AdminDashboard` component but with a "Manager" badge instead of "Administrator". Since both roles need the same system-wide overview, the Manager Dashboard will reuse the Admin Dashboard directly.

The simplest approach: change `ManagerDashboard` to render `AdminDashboard` internally, just overriding the header title/badge to say "Manager Dashboard" instead of "Admin Dashboard."

However, since the AdminDashboard component has its own hardcoded header with "Admin Dashboard" title and "Administrator" badge, the cleanest approach is:

1. **Update `ManagerDashboard.tsx`** -- strip out all the legacy components and instead render the same widget set as AdminDashboard: `AttentionAlertBar`, `CrossModuleStatsRow`, `DecliningLocationsCard`, `WeakestSectionsCard`, `WorkforceAnalytics`, `TasksWidget`, `OpenCorrectiveActionsWidget`, `WhatsAppStatsWidget`, `MaintenanceInterventions`, `DraftAudits`, and `DashboardGreeting` -- but keep the "Manager Dashboard" header and "Manager" badge.

### What Changes

| File | Change |
|------|--------|
| `src/components/dashboard/ManagerDashboard.tsx` | Replace legacy widgets (CompliancePieChart, LocationTrendAnalysis, SectionPerformanceTrends, individual StatsCards) with the same widget set used by AdminDashboard (AttentionAlertBar, CrossModuleStatsRow, DecliningLocationsCard, WeakestSectionsCard, WorkforceAnalytics, TasksWidget, OpenCorrectiveActionsWidget, WhatsAppStatsWidget, MaintenanceInterventions) |

### Technical Details

The new ManagerDashboard will have:
- Same header but with "Manager Dashboard" title and "Manager" badge
- DateRangeFilter (already present)
- DashboardGreeting (already present)
- DraftAudits (already present)
- AttentionAlertBar (new -- replaces pending audits card)
- CrossModuleStatsRow (new -- replaces individual StatsCards)
- DecliningLocationsCard + WeakestSectionsCard side-by-side (new -- replaces CompliancePieChart + LocationPerformanceChart)
- WorkforceAnalytics (new -- replaces nothing, additive)
- TasksWidget + OpenCorrectiveActionsWidget side-by-side (replaces old TasksWidget + MaintenanceInterventions layout)
- WhatsAppStatsWidget (new)
- MaintenanceInterventions (kept, moved to bottom)

Components removed:
- CompliancePieChart
- LocationPerformanceChart
- LocationTrendAnalysis
- SectionPerformanceTrends
- StatsCard grid
- StatsDetailDialog
- RecentAudits
- Pending audits warning card
- Collapsible mobile stats section

### Result
Managers see the exact same actionable intelligence hub as admins, with the same cross-module KPIs, alerts, and drill-down widgets -- just labeled "Manager Dashboard" instead of "Admin Dashboard."
