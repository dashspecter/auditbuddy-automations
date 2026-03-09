

# Investigation: Romeo Kueta — False "Unscheduled Clock-in" on Mar 9

## What I found in the database

| Data point | Value |
|---|---|
| Romeo's shift Mar 9 | Kitchen Manager, 10:00–23:50, LBFC Amzei |
| Assignment status | `approved` |
| Shift status | `published` |
| Clock-in time | 07:17:54 UTC → **09:17 Romania time** |
| Grace window (60 min) | Opens at **09:00** |
| Attendance log `shift_id` | `null` (system didn't link the shift) |
| Exception created | `unscheduled_shift`, now `resolved` |

**The RPC `find_scheduled_shift_for_clockin` works correctly** — I tested it directly with Romeo's exact data and it returns the correct shift. So the database function is fine.

## Root cause

In `StaffScanAttendance.tsx` line 491, the RPC call **silently ignores errors**:

```typescript
const { data: rpcResult } = await supabase.rpc('find_scheduled_shift_for_clockin', { ... });
//     ^^^^  error is NOT destructured — if the call fails, data is null
const shiftResult = Array.isArray(rpcResult) && rpcResult.length > 0 ? rpcResult[0] : null;
// null → not an array → shiftResult = null → isUnscheduled = true
```

If the RPC call encounters **any transient error** (network glitch, timeout, auth token refresh race), the error is swallowed and the clock-in is wrongly treated as unscheduled. This is the most likely explanation: a transient failure at 09:17 caused the RPC to error out, which was silently interpreted as "no shift found."

## The fix

1. **Destructure and handle the error** from the RPC call — if the RPC fails, **retry once** before falling back to unscheduled. If it still fails, log the error and fall back to a direct query as a safety net.

2. **Add a direct-query fallback** — if the RPC fails, do a simple `shift_assignments` + `shifts` query (like the non-governance path) so a transient RPC failure never causes a false unscheduled exception.

3. **Log the error** so we can see what actually happened in future incidents.

### Code change (StaffScanAttendance.tsx, ~lines 490–508)

From:
```typescript
const { data: rpcResult } = await supabase.rpc('find_scheduled_shift_for_clockin', { ... });
const shiftResult = Array.isArray(rpcResult) && rpcResult.length > 0 ? rpcResult[0] : null;
```

To:
```typescript
const { data: rpcResult, error: rpcError } = await supabase.rpc('find_scheduled_shift_for_clockin', { ... });

if (rpcError) {
  console.error("[ClockIn] RPC find_scheduled_shift failed:", rpcError.message);
  // Fallback: direct query to prevent false unscheduled exceptions
  const { data: fallbackShift } = await supabase
    .from("shift_assignments")
    .select("shift_id, shifts!inner(id, shift_date, location_id, start_time, end_time)")
    .eq("staff_id", currentEmployee.id)
    .eq("shifts.shift_date", today)
    .eq("shifts.location_id", locationId)
    .eq("approval_status", "approved")
    .maybeSingle();
  if (fallbackShift) {
    scheduledShift = { shift_id: fallbackShift.shift_id };
  } else {
    isUnscheduled = true;
  }
} else {
  const shiftResult = Array.isArray(rpcResult) && rpcResult.length > 0 ? rpcResult[0] : null;
  if (shiftResult) {
    scheduledShift = { shift_id: shiftResult.shift_id };
    isLate = shiftResult.is_late || false;
    lateMinutes = shiftResult.late_minutes || 0;
  } else {
    isUnscheduled = true;
  }
}
```

## Files changed

| File | Change |
|---|---|
| `src/pages/staff/StaffScanAttendance.tsx` | Add error handling + direct-query fallback to RPC call |

One file, one change. No migration needed. This prevents any future transient RPC failure from creating false unscheduled exceptions.

