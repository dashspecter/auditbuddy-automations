

## Redesign Admin Dashboard: Actionable Intelligence Hub

The current dashboard is audit-heavy -- it shows 6 stat cards about audits, a compliance pie chart, location trends, section performance, and maintenance. While useful, it misses the cross-module intelligence that would help a manager take immediate action. Here is a redesign that surfaces the most decision-driving information from ALL the platform's data.

---

### Current State

The Admin Dashboard currently shows:
1. Greeting + draft audits reminder
2. 6 stat cards (all audit-focused: this week, completed, overdue, avg score, worst/best location)
3. Compliance pie chart + Location performance bar chart
4. Location trend analysis (per-location sparklines)
5. Section performance trends (filterable by template)
6. Maintenance schedule (upcoming/overdue)

**What is missing:** Workforce health, task completion, corrective actions, training gaps, and wastage -- all data the platform already collects.

---

### Proposed Layout (Top to Bottom)

#### 1. Smart Greeting + "Needs Your Attention" Alert Bar
Keep the current greeting but add a compact alert row below it that aggregates urgent items across modules:
- X overdue audits
- X overdue tasks
- X open corrective actions
- X overdue maintenance
- X at-risk employees (score below 50)

Each is a clickable badge that navigates to the relevant page. This single row replaces the need to scroll the entire dashboard to find problems.

#### 2. KPI Summary Row (6 cards, same layout as today)
Restructure the 6 stat cards to cover the full business, not just audits:
- **Audit Score** -- average across all locations (existing)
- **Task Completion Rate** -- % of tasks completed on time this period
- **Workforce Score** -- average employee performance score
- **Open CAs** -- corrective actions in open/in_progress status
- **Training Compliance** -- % of assigned trainings completed
- **Attendance Rate** -- average attendance score

Each card remains clickable for drill-down.

#### 3. "Declining Locations" Spotlight (NEW)
A compact card that only shows locations whose audit trend is "declining" (already computed by `usePerformanceTrends`). Instead of showing ALL locations (which buries the signal), this highlights only the 2-3 that need attention, with their current score, previous score, and change %. Click to navigate to the full location trend view.

#### 4. Weakest Sections (NEW)
A horizontal bar chart (or ranked list) of the bottom 5 audit sections by average score. This tells the manager exactly which operational areas need investment -- e.g., "Hygiene: 72%" or "Fridges: 5%". Data already exists in `usePerformanceTrends` -> `sectionPerformance`.

#### 5. Workforce Health Summary (NEW -- uses existing WorkforceAnalytics)
A condensed version of the WorkforceAnalytics widget showing:
- Top 3 performers (mini leaderboard)
- Employees needing attention (score below 50)
- Late arrivals count + missed shifts
This already exists as `WorkforceAnalytics` component -- we just embed a compact version.

#### 6. Tasks + Corrective Actions Side-by-Side
Two half-width cards:
- **Left: Tasks Overview** -- reuse existing `TasksWidget` (pending, overdue, completed + urgent list)
- **Right: Open Corrective Actions** -- new mini widget showing open CAs by severity, with SLA status

#### 7. Compliance + Location Performance (existing, keep)
The pie chart and bar chart remain as-is in a 2-column grid.

#### 8. Maintenance Schedule (existing, keep at bottom)

---

### What Gets Removed/Moved
- The 6 audit-only stat cards are replaced with cross-module KPIs
- "This Week Audits" card is folded into the alert bar
- Full location trend analysis (all locations with sparklines) moves behind a "View All" link -- only declining ones show on dashboard
- Section performance trends section stays but moves below the new widgets

---

### Technical Approach

**New components to create:**
1. `src/components/dashboard/AttentionAlertBar.tsx` -- aggregates overdue counts from audits, tasks, CAs, maintenance, workforce
2. `src/components/dashboard/DecliningLocationsCard.tsx` -- filters `usePerformanceTrends` for declining only
3. `src/components/dashboard/WeakestSectionsCard.tsx` -- bottom 5 sections bar chart
4. `src/components/dashboard/OpenCorrectiveActionsWidget.tsx` -- mini CA summary
5. `src/components/dashboard/CrossModuleStatsRow.tsx` -- the new 6 KPI cards

**Existing components reused:**
- `TasksWidget` -- embedded as-is
- `WorkforceAnalytics` -- embedded with `showDateFilter={false}` and limited view
- `CompliancePieChart`, `LocationPerformanceChart` -- kept
- `MaintenanceInterventions` -- kept

**Data hooks already available:**
- `useDashboardStats` / `useMvDashboardOverview` -- audit KPIs
- `usePerformanceTrends` -- location trends + section scores
- `usePerformanceLeaderboard` -- workforce scores
- `useTaskStats` -- task completion rates
- `useCorrectiveActions` -- open CAs count
- `useEquipmentInterventions` -- maintenance overdue
- `useTrainingAssignments` -- training completion

**File modified:**
- `src/components/dashboard/AdminDashboard.tsx` -- restructured layout with new + existing widgets

**No database changes needed** -- all data already exists in the platform.

---

### Why This Makes a Difference

The current dashboard answers: "How are my audits doing?"

The new dashboard answers:
- "What needs my attention RIGHT NOW?" (alert bar)
- "Which locations are getting worse?" (declining spotlight)
- "What operational areas are failing?" (weakest sections)
- "Are my employees performing?" (workforce health)
- "Are corrective actions being resolved?" (CA widget)
- "Are daily tasks getting done?" (task widget)

This turns the homepage from a reporting screen into a **decision-making cockpit**.

