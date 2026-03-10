

# Fix: `duration_minutes` Missing from Kiosk Task Mapping

## Root Cause

In `src/components/kiosk/KioskDashboard.tsx` lines 276-289, the task mapping explicitly picks fields but **omits `duration_minutes`**:

```typescript
return {
  id: task.id,
  title: task.title,
  status: task.status,
  assigned_to: task.assigned_to,
  priority: task.priority,
  start_at: task.start_at,
  due_at: task.due_at,
  role_ids: originalTask?.role_ids || [],
  role_names: originalTask?.role_names || [],
  // ... no duration_minutes!
}
```

This causes `getTaskDeadline` to skip the `start_at + duration_minutes` calculation and fall through to the 30-minute fallback: `start_at + 30min = 11:00`. At 10:47:56, that's exactly **12m 4s** — matching the screenshot.

The correct deadline should be `10:30 + 60min = 11:30`, showing ~42 minutes remaining.

## Fix

**File: `src/components/kiosk/KioskDashboard.tsx`** (line ~282)

Add `duration_minutes` to the mapped task object:

```typescript
return {
  id: task.id,
  title: task.title,
  status: task.status,
  assigned_to: task.assigned_to,
  priority: task.priority,
  start_at: task.start_at,
  due_at: task.due_at,
  duration_minutes: task.duration_minutes,  // ← ADD THIS
  role_ids: originalTask?.role_ids || [],
  role_names: originalTask?.role_names || [],
  isLocationOnly: !task.assigned_role_id && !task.assigned_to,
  timeLock: task.timeLock,
}
```

Also audit the same mapping for any other fields used by `getTaskDeadline` or `isTaskOverdue` — specifically `assigned_role_id` is already referenced on line 287 but not included in the mapping (it works because it's only used for the `isLocationOnly` flag, not downstream). No other missing fields affect deadline calculation.

## General Rule (Summary)

**Task deadline priority:**
1. `start_at + duration_minutes` (if both exist)
2. `due_at` (explicit deadline)
3. `start_at + 30min` (fallback — should rarely apply)

**Badge states:**
- **Upcoming** (`now < start_at`): countdown to start
- **In Progress** (`start_at ≤ now < deadline`): countdown to deadline
- **Overdue** (`now ≥ deadline`): red overdue badge

The bug was purely a data-mapping omission, not a logic error.

