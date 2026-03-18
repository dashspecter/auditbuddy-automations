

# Plan: Fix P2 — Role Guard on Manual Checkout Button + Performance-Bounded Logs Query

## Point 1: Hide manual checkout button from non-authorized roles

**Current problem**: The edit (manual checkout) button on line 175 of `Attendance.tsx` is visible to everyone. Only managers, admins, and HR should see it.

**Fix**: Import `useCan` hook and check `can('update', 'attendance')` (or equivalent resource). Wrap the edit button in a conditional that only renders when the user has permission.

Concretely:
- Import `useCan` from `@/hooks/useCan`
- Call `const { can } = useCan()` at the top of the component
- Wrap the edit button: `{can('update', 'attendance').allowed && (!log.check_out_at || log.auto_clocked_out) && ( <Button ... /> )}`

If `attendance` is not a recognized resource in the `useCan` system, we fall back to checking `useUserRole` for `isAdmin || isManager || isHR`. I'll verify the resource list in `useCan.ts` first during implementation.

**File**: `src/pages/workforce/Attendance.tsx`

---

## Point 2: Bounded attendance logs query + custom date interval

**Current problem**: Line 64 calls `useAttendanceLogs(locationFilter)` with NO date filter — fetches the entire history, then filters client-side for week/month tabs. This gets slower as data grows.

**Fix**: Replace the unbounded `allLogs` query with server-side date filtering per tab, plus add a "Custom" tab with a date range picker.

Changes:

### `src/pages/workforce/Attendance.tsx`
- Remove the single unbounded `allLogs` query
- Each tab fetches its own date-bounded data using `useAttendanceLogs(locationFilter, startDate, endDate)`
- Add a 4th tab "Custom" with two date pickers (start/end) using the Shadcn Popover+Calendar pattern
- Default custom range: last 7 days
- The week and month tabs pass their computed start/end dates directly to the hook (server-side filtering)
- Remove the client-side `weekLogs` and `monthLogs` `useMemo` filters since the server now handles it

### `src/hooks/useAttendanceLogs.ts`
- The hook already supports `date` and `endDate` parameters — no changes needed here

**Result**: Each tab only fetches exactly the data it needs. The "Custom" tab gives users flexibility for any date range.

---

## Summary of changes

| File | What changes |
|------|-------------|
| `src/pages/workforce/Attendance.tsx` | Add `useCan` role check on edit button; replace unbounded query with per-tab server-side queries; add "Custom" date range tab |

No database or backend changes needed.

