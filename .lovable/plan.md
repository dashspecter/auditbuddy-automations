

# Redesign: "By Employee" Task View

## Problem
The current view crams too much into each employee row — tiny timeline blocks, badge clusters, and collapsed details make it hard to quickly assess employee task status. The timeline bars are too small to be useful, and the overall layout feels cluttered rather than informative.

## Proposed New Design

Replace the current timeline-row approach with a **clean card-based layout** per employee, showing clear task progress at a glance.

### Layout Structure

```text
┌─────────────────────────────────────────────────────────┐
│ [Controls Bar] Date Nav │ Location Filter │ View Toggle │
├─────────────────────────────────────────────────────────┤
│ Summary: 3 employees • 20 tasks • 14 overdue • 0 done  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 👤 Ala Aldghrati  ·  Chef  ·  08:00–16:00              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│ │ 🔴 9     │ │ ⏳ 11    │ │ ✅ 0     │  ██████░░ 0%   │
│ │ Overdue  │ │ Pending  │ │ Done     │                 │
│ └──────────┘ └──────────┘ └──────────┘                 │
│                                                         │
│ ┌─ Tasks by Hour ──────────────────────────────────────┐│
│ │ 06:00  ☐ Hats & Hair Nets         🔴 overdue  30m  ││
│ │ 06:00  ☐ Sanitizer Check          🔴 overdue  15m  ││
│ │ 08:00  ☐ Temperature Logs         ⏳ pending  20m  ││
│ │ ...                                                  ││
│ └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Key Changes

1. **Employee card header** — Avatar, name, role, shift time, and a progress bar with percentage — all visible without expanding.

2. **3 stat mini-cards** (overdue / pending / completed) inside each employee card — color-coded, large numbers, immediately scannable.

3. **Task list grouped by hour** — Tasks listed chronologically with clear time, title, status icon, priority badge, and duration. No more tiny timeline blocks.

4. **Expandable by default for employees with overdue tasks** — Auto-expand cards that need attention; collapse others.

5. **Remove the graphical timeline bar** — Replace with the structured hour-grouped list which is far more readable and actionable.

6. **Sort employees by urgency** — Employees with most overdue tasks appear first, then by pending count, then those with no tasks last.

### File Changes

| File | Change |
|------|--------|
| `src/components/tasks/ByEmployeeTimeline.tsx` | Full rewrite of `ScheduledEmployeeRow` and `TimelineTaskBlock`. Remove timeline positioning logic. Add hour-grouped task list, stat mini-cards, progress bar. Keep controls bar (date nav, location filter, summary badges). Sort employees by overdue count desc. |

### What stays the same
- Controls bar (date navigation, location filter)
- Summary badges row
- Data fetching logic (scheduledEmployees, task filtering, occurrence engine)
- onComplete / onEdit / onDelete handlers

