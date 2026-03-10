

# Fix Kiosk Overdue Logic — Align with Task Unlock Window

## Problem Confirmed

A task scheduled at 10:00 with `unlock_before_minutes = 30` unlocks at 09:30. But the kiosk marks it **OVERDUE at 10:01** because inline checks treat `start_at` as the deadline.

Meanwhile, the canonical `getTaskDeadline` returns `null` for these tasks (no `duration_minutes`, no `due_at`), so non-kiosk views never mark them overdue at all — an inconsistency.

## Safety Analysis

The change is **safe** and **non-breaking**:

- **Canonical path** (`getTaskDeadline` in `taskOccurrenceEngine.ts`): Currently returns `null` for `start_at`-only tasks. After fix, returns `start_at + 30min`. Effect: these tasks can now become overdue after 30min, which is correct. All consumers (unified pipeline, ops dashboard, calendar, mobile) already use `isTaskOverdue` → `getTaskDeadline`, so they'll get the improved behavior automatically.
- **Kiosk inline checks**: Currently treat `start_at` as deadline (too aggressive). After fix, replaced with canonical function. Effect: overdue triggers at `start_at + 30min` instead of `start_at + 0min`.
- **Tasks WITH `duration_minutes` or `due_at`**: Completely unchanged — the new fallback only applies when both are absent.
- **`wasTaskCompletedLate`**: Also uses `getTaskDeadline` — will correctly flag late completions for `start_at`-only tasks (currently can't, returns `null`).

## Changes

### 1. `src/lib/taskOccurrenceEngine.ts` — Add 30-min grace fallback
```typescript
export const getTaskDeadline = (task: Task): Date | null => {
  if (task.start_at && task.duration_minutes) {
    return new Date(new Date(task.start_at).getTime() + task.duration_minutes * 60000);
  }
  if (task.due_at) return new Date(task.due_at);
  // Grace period: start_at alone is NOT a deadline, add 30min window
  if (task.start_at) {
    return new Date(new Date(task.start_at).getTime() + 30 * 60000);
  }
  return null;
};
```

### 2. `src/lib/taskDateUtils.ts` — Same fix (duplicate copy)
Apply identical 30-min fallback.

### 3. `src/lib/taskTimeLock.ts` — Remove duplicate, import canonical
Replace local `getTaskDeadline` with import from `taskOccurrenceEngine.ts`.

### 4. `src/components/kiosk/KioskDashboard.tsx` — Replace 4 inline checks
Replace all four `isPast(start_at)` overdue checks with the canonical `getTaskDeadline`:
- **Line 328** (KPI counter)
- **Line 551** (sort function)
- **Line 596** (legacy helper)
- **Line 843** (render)

All become:
```typescript
const deadline = getTaskDeadline(t);
const isOverdue = t.status !== "completed" && deadline ? isPast(deadline) : false;
```

### Files Changed

| File | Change |
|---|---|
| `src/lib/taskOccurrenceEngine.ts` | Add 30-min grace fallback in `getTaskDeadline` |
| `src/lib/taskDateUtils.ts` | Same fix (duplicate) |
| `src/lib/taskTimeLock.ts` | Remove duplicate, import from taskOccurrenceEngine |
| `src/components/kiosk/KioskDashboard.tsx` | Replace 4 inline overdue checks with canonical function |

No database changes needed.

