

# Enhance Mobile Command Center — Richer Operational Snapshot

## What You're Asking For (3 things)

1. **Live Workforce**: Show who is *scheduled* for each location today, not just who's clocked in — so you can see who's missing
2. **This Week**: Expand beyond just audit stats — add open tasks, open CAs, and workforce summary for the week
3. **30-Day Attention / CAs**: Show the actual CA title + location, not just a count

All three make sense and are achievable with existing data.

---

## Changes

### 1. Live Workforce — Add "Expected" Employees

Currently shows only clocked-in employees grouped by location. We'll enhance it to also show **scheduled employees for today** per location, so you can see at a glance who hasn't arrived yet.

**Data**: Query `shifts` (today, published) → `shift_assignments` (approved) → `employees` (name, role) → `locations` (name). Group by location. Cross-reference with clocked-in list to mark each person as "Here" or "Expected".

**UI**: Each location section shows:
- Employees already clocked in (green dot, with clock-in time)
- Employees scheduled but not yet clocked in (gray dot, with shift start time)
- A small ratio badge like "2/4 arrived"

**Files**: `useMobileCommandData.ts` (new `useScheduledToday` query), `LiveWorkforceSection.tsx` (merged display)

### 2. This Week — Expand Beyond Audits

Currently only shows audit KPIs (completed count, avg score, locations). We'll add:

- **Open Tasks**: Count of tasks due this week (from `tasks` table, status open/in_progress)
- **Open CAs**: Count of open corrective actions with overdue count
- **Workforce**: Total shifts scheduled vs filled this week

**UI**: Add a second row of KPI tiles below the audit KPIs:
```text
[ Tasks Due: 5 ] [ Open CAs: 3 ] [ Shifts: 12/15 ]
```

**Files**: `useMobileCommandData.ts` (expand `useWeeklyAuditSummary` to also fetch tasks + CAs + shifts for the week), `WeeklyAuditSummary.tsx` (add extra KPI row)

### 3. Open CAs — Show Title + Location

Currently the 30-Day Attention section shows "X open corrective actions (Y overdue)" as a single line. We'll expand it to list each open CA with its title, location, and severity.

**Data**: Change the CA query from `select('id, status, due_at')` to `select('id, status, due_at, title, severity, locations(name)')`. Return the list in `MonthlyNegativeData`.

**UI**: Instead of a single summary line, show each CA as a compact row:
```
🔴 [Critical] Fix broken freezer — LBFC Amzei (overdue)
🟡 [Medium] Update cleaning schedule — Bab's Obor
```

**Files**: `useMobileCommandData.ts` (enrich CA query + type), `MonthlyNegativeSummary.tsx` (render CA list)

---

## Files to Change

| File | What |
|------|------|
| `src/hooks/useMobileCommandData.ts` | Add `useScheduledToday` hook; expand weekly summary with tasks/CAs/shifts; enrich CA query with title/location/severity |
| `src/components/mobile-command/LiveWorkforceSection.tsx` | Merge scheduled + clocked-in employees per location; show arrival status |
| `src/components/mobile-command/WeeklyAuditSummary.tsx` | Add second KPI row for tasks, CAs, shifts |
| `src/components/mobile-command/MonthlyNegativeSummary.tsx` | Render individual CA rows with title, location, severity badge |
| `src/pages/MobileCommand.tsx` | Pass new data props (scheduled employees) to LiveWorkforceSection |

No database migrations needed — all data exists in current tables.

