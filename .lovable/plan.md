

# Show Filtered Location on Task Cards

## Problem
When filtering by location (e.g. "LBFC Amzei"), task cards always show `task_location_names[0]` — the first location in the array. If a task is assigned to [LBFC Obor, LBFC Amzei], the card shows "LBFC Obor" even when you filtered by "LBFC Amzei". The user expects to see the filtered location displayed prominently.

## Fix — `src/pages/Tasks.tsx`

### 1. Pass `selectedLocationId` to both card components
Add a `filterLocationId` prop to `TaskItem` and `TaskListItem`.

### 2. Resolve the filtered location name
Use the existing `useLocations()` data (already available in Tasks.tsx) to build a `locationNameMap`. Pass the resolved name as `filterLocationName` or compute it inside the components.

### 3. Update location display logic in both components
In `TaskItem` (line 228-243) and `TaskListItem` (line 94-109), change the location rendering:

```tsx
// Current: always shows task_location_names[0]
{task.task_location_names[0]}

// New: if filtering by a location, show that location first
// If the filtered location is in the list, show it; otherwise show [0]
```

Specifically:
- If `filterLocationId` is set and `task_location_ids` contains it, find its index and show `task_location_names[thatIndex]` instead of `[0]`
- The "+N" badge should still show the count of *other* locations
- If no filter is active, behavior stays the same (show first location)

### 4. Wire it up in all render sites
Pass `filterLocationId={selectedLocationId !== "all" ? selectedLocationId : undefined}` to every `<TaskItem>` and `<TaskListItem>` usage (lines 713, 764, 824, 847, 870, 893, 909).

Also pass to `AllTasksOpsDashboard` and `ByEmployeeTimeline` if they render task location info internally.

## Scope
Single file change: `src/pages/Tasks.tsx`. The `TaskItem` and `TaskListItem` components are defined inline in this file.

