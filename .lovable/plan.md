

# Fix Kiosk Department Filtering — Multiple Bugs

## Problems Found

The department filter only works on the **employee list**. Three other data sources on the kiosk dashboard ignore it entirely:

1. **MTD Score leaderboard** — `useLocationPerformanceScores` fetches ALL employees at the location via the `calculate_location_performance_scores` DB function. Employees from other departments appear in the leaderboard (visible in your screenshot: Cook, Chef, Kitchen Manager all show on the Front of House kiosk).

2. **Tasks / KPIs (Done Today, Pending, Overdue)** — `useKioskTodayTasks` fetches ALL tasks for the location regardless of department. Tasks assigned to kitchen roles still appear on the FOH kiosk.

3. **Today's Champions** — Derived from the unfiltered completed tasks, so champions from other departments can appear.

The **Today's Team** and **Clocked In** count ARE correctly filtered because they derive from the already-filtered `employees` list.

## Fix Approach

All fixes are **client-side filtering** in `KioskDashboard.tsx` — no database changes needed. The data is already fetched; we just need to filter it down using the department role names list that's already being queried.

### 1. `src/components/kiosk/KioskDashboard.tsx` — Filter MTD Scores

The `weeklyScoreLeaderboard` (line ~429) currently shows all employees. Add a filter step that keeps only employees whose `role` matches the department's role names:

```typescript
const weeklyScoreLeaderboard = useMemo(() => {
  let scores = computeEffectiveScores(weeklyAllScores, true);
  // Filter by department roles if set
  if (departmentId && departmentRoleNames) {
    scores = scores.filter(s => departmentRoleNames.includes(s.role));
  }
  return sortByEffectiveScore(scores).slice(0, 10);
}, [weeklyAllScores, departmentId, departmentRoleNames]);
```

### 2. `src/components/kiosk/KioskDashboard.tsx` — Filter tasks by department

After the unified tasks are mapped (line ~252), add a filter that keeps only tasks whose `role_names` overlap with the department's roles (or tasks assigned to a department employee). Location-only (General) tasks should still show since they apply to everyone.

```typescript
const tasks = useMemo(() => {
  if (todaysTeam.length === 0) return [];
  
  let mapped = unifiedTasks.map(task => { /* existing mapping */ });
  
  // Filter tasks by department roles
  if (departmentId && departmentRoleNames) {
    const deptEmployeeIds = new Set(employees.map(e => e.id));
    mapped = mapped.filter(task => {
      // Keep tasks assigned directly to a department employee
      if (task.assigned_to && deptEmployeeIds.has(task.assigned_to)) return true;
      // Keep tasks with matching role names
      if (task.role_names?.some(r => departmentRoleNames.includes(r))) return true;
      // Keep General/unassigned tasks (no role, no assignee) — shared across all
      if (!task.assigned_to && (!task.role_names || task.role_names.length === 0)) return true;
      return false;
    });
  }
  
  return mapped;
}, [unifiedTasks, todaysTeam, rawTasks, departmentId, departmentRoleNames, employees]);
```

### 3. KPIs and Champions cascade automatically

The KPI counts (`unifiedCompletedCount`, `unifiedPendingCount`, `unifiedOverdueCount`) and Champions are derived from the unified task groupings which come from `useKioskTodayTasks` — these are NOT filtered. We need to recompute grouped counts from the filtered `tasks` array instead of using `unifiedGrouped` directly. This means:

- Recompute `completedCount`, `pendingCount`, `overdueCount` from the filtered `tasks` list
- Recompute champions from filtered completed tasks only

This ensures every section on the kiosk — Team, Tasks, KPIs, Champions, MTD Scores — respects the department filter.

