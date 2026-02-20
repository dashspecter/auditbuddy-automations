

## Make All Dashboard Cards Clickable and Remove Redundant Reports

### Problem
Several dashboard cards (Declining Locations, Weakest Sections, Workforce Analytics) are not fully clickable, and the bottom half of the dashboard still has "old-style" report widgets (Compliance Pie Chart, Location Performance Line Chart, Section Performance Trends, and Recent Audits single stat card) that duplicate information already surfaced by the new intelligence widgets above them.

### What Gets Removed
These 4 components are removed from the Admin Dashboard layout:
- **RecentAudits** -- was a single "This Week Audits" stat card; this info is already covered by the Attention Alert Bar and CrossModuleStatsRow
- **CompliancePieChart** -- compliant vs non-compliant split; the Audit Score KPI card and Weakest Sections already convey this
- **LocationPerformanceChart** -- location scores over time; Declining Locations card already highlights what matters
- **SectionPerformanceTrends** -- section-level line charts with filters; Weakest Sections card already shows the bottom performers

These components stay in the codebase (they may be used elsewhere or in reports), they are just removed from the dashboard layout.

### What Gets Made Clickable
- **DecliningLocationsCard** -- entire card header area gets an onClick navigating to `/audits`
- **WeakestSectionsCard** -- each section row becomes clickable, navigating to `/audits` (where the user can filter by section); card header links to `/audits`
- **WorkforceAnalytics** -- already has internal navigation, no change needed
- **MaintenanceInterventions** -- verify it navigates to `/maintenance` on click

### Changes

**File: `src/components/dashboard/AdminDashboard.tsx`**
- Remove imports for `RecentAudits`, `CompliancePieChart`, `LocationPerformanceChart`, `SectionPerformanceTrends`
- Remove sections 6, 7, and 8 from the layout (Recent Audits, Compliance + Location Performance grid, Section Performance Trends)
- Keep: Attention Alert Bar, Cross-Module Stats, Declining + Weakest grid, Workforce, Tasks + CAs, and Maintenance

**File: `src/components/dashboard/WeakestSectionsCard.tsx`**
- Add `useNavigate` and make each section row clickable with `cursor-pointer hover:bg-accent/50` and `onClick={() => navigate("/audits")}`

**File: `src/components/dashboard/DecliningLocationsCard.tsx`**
- Make each location row clickable to navigate to its specific audit page (already has a "View All" button, but individual items should also be clickable)

### Resulting Dashboard Layout (cleaner, every element actionable)
1. Header + Date Filter
2. Greeting + Draft Audits
3. Attention Alert Bar (all badges clickable)
4. Cross-Module KPI Row (all 6 cards clickable)
5. Declining Locations + Weakest Sections (cards and rows clickable)
6. Workforce Health Summary
7. Tasks + Corrective Actions (items and "View All" clickable)
8. Maintenance Schedule

