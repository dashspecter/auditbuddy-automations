

## Add Preview Popups to All Dashboard Cards

### Concept
Instead of navigating directly to a full page when clicking a dashboard card, each card will first open a popup (responsive dialog -- drawer on mobile, dialog on desktop) showing a richer summary. From that popup, the user can then click "Go to [module]" to navigate to the full page. This creates a two-step drill-down: card click -> summary popup -> full page.

### Cards That Get Popups

1. **KPI Stats Row (6 cards)** -- Audit Score, Task Completion, Workforce Score, Open CAs, Training, Attendance
2. **Declining Locations Card** -- click a location row -> popup with that location's trend details
3. **Weakest Sections Card** -- click a section row -> popup with section breakdown
4. **Attention Alert Bar badges** -- each badge opens a popup showing the relevant overdue/at-risk items
5. **Tasks Widget rows** -- already navigates to tasks; will open a task detail popup first
6. **CA Widget rows** -- already navigates to CA detail; will open a CA summary popup first

### What Each Popup Shows

| Card | Popup Content |
|------|--------------|
| Audit Score | Average score, best/worst location, recent audit list, trend sparkline |
| Task Completion | Pending/overdue/completed breakdown, top 5 urgent tasks list |
| Workforce Score | Top 3 performers, bottom 3 at-risk, average score gauge |
| Open CAs | By severity breakdown, overdue list, recent CAs |
| Training | Completion %, overdue assignments, by-department breakdown |
| Attendance | Present rate, late arrivals, missed shifts summary |
| Declining Location (row) | Location name, score history, last 3 audit scores, trend direction |
| Weakest Section (row) | Section name, avg score, locations where it's weakest, recent scores |
| Alert Badge | List of the specific overdue/at-risk items with quick info |
| Task row | Task title, assignee, due date, priority, location |
| CA row | CA title, severity, SLA status, assigned to, location |

### Technical Approach

**New component:** `src/components/dashboard/DashboardPreviewDialog.tsx`
- A reusable wrapper using the existing `ResponsiveDialog` component
- Accepts a `type` prop (audit, task, workforce, ca, training, attendance, location, section, alert)
- Accepts relevant data/filters as props
- Renders the appropriate summary content based on type
- Always includes a "Go to [Module]" button at the bottom that navigates to the full page

**Individual popup content components** (created inside `src/components/dashboard/popups/`):
- `AuditScorePopup.tsx` -- uses `useDashboardStats`
- `TaskCompletionPopup.tsx` -- uses `useTaskStats` + `useTasks`
- `WorkforceScorePopup.tsx` -- uses `usePerformanceLeaderboard`
- `OpenCAsPopup.tsx` -- uses `useCorrectiveActions`
- `TrainingPopup.tsx` -- uses `useTrainingAssignments`
- `AttendancePopup.tsx` -- uses `useMvAttendanceStats`
- `LocationDetailPopup.tsx` -- uses `usePerformanceTrends` filtered to one location
- `SectionDetailPopup.tsx` -- uses `usePerformanceTrends` filtered to one section

**Modified components:**
- `CrossModuleStatsRow.tsx` -- each `StatsCard` onClick opens popup instead of navigating
- `DecliningLocationsCard.tsx` -- row onClick opens location popup
- `WeakestSectionsCard.tsx` -- row onClick opens section popup
- `AttentionAlertBar.tsx` -- badge onClick opens alert popup
- `TasksWidget.tsx` -- row onClick opens task popup
- `OpenCorrectiveActionsWidget.tsx` -- row onClick opens CA popup
- `StatsCard.tsx` -- no changes needed (onClick handler is already a prop)

**State management:** Each parent component manages its own `[popupOpen, setPopupOpen]` state and passes the selected item data to the popup component.

### User Flow
1. User sees dashboard with all cards and widgets
2. Clicks any card/row/badge
3. A popup appears with a summary of that module's data
4. User reviews the info -- can close the popup or click "View All [Module]" to navigate to the full page
5. On mobile, the popup renders as a bottom drawer for better UX

