

# Make "By Employee" task rows read-only

The `HourTaskRow` component currently has:
1. A **checkbox** that triggers `onComplete()` — allows completing tasks
2. A **clickable title** (`onClick={onEdit}`) — navigates to task edit

This view is for managers to monitor status at a glance. It should be read-only.

## Changes

**`src/components/tasks/ByEmployeeTimeline.tsx`**

1. **Remove checkbox interactivity** (line 120-125): Keep the checkbox visual as a status indicator but make it fully disabled (remove `onCheckedChange` handler)

2. **Remove title click handler** (lines 128-131): Remove `cursor-pointer` class and `onClick={onEdit}` from the title wrapper — title stays as plain text

3. Optionally remove `onComplete` and `onEdit` props from `HourTaskRow` since they're no longer used there (clean up)

