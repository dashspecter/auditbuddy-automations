

# Fix Kiosk Crash: "useAuth must be used within an AuthProvider"

## Root Cause
The kiosk route (`/kiosk/:token`) runs **outside** the `AuthProvider` (it's an anonymous public route). The call chain is:

```text
KioskDashboard
  → useLocationPerformanceScores (re-export of useEmployeePerformance)
    → useCompany()
      → useAuth()  ← CRASH: no AuthProvider
```

The kiosk already has `locationId` and `companyId` as props — it doesn't need `useCompany` at all.

## Fix

**File: `src/components/kiosk/KioskDashboard.tsx`**

Replace the `useLocationPerformanceScores` hook call with a direct `useQuery` + `supabase.rpc("calculate_location_performance_scores", ...)` call. The kiosk already has `locationId` as a prop, so we can call the RPC directly without going through `useEmployeePerformance` → `useCompany` → `useAuth`.

Changes:
1. Remove the `import { useLocationPerformanceScores }` line
2. Add a local `useQuery` that calls `supabase.rpc("calculate_location_performance_scores", { p_location_id: locationId, p_start_date, p_end_date })` directly
3. Map the results using the same `mapRpcRow`-style logic already present in `useEmployeePerformance`

This is a **kiosk-only** change. No other component, hook, or flow is modified.

## Secondary Bug (parameter order)
The current call `useLocationPerformanceScores(locationId, startDate, endDate)` passes arguments in the wrong order — the hook signature is `(startDate, endDate, locationId)`. The direct RPC call fixes this too since we'll use named parameters.

## Impact
- Only `KioskDashboard.tsx` is modified
- No changes to `useEmployeePerformance`, `useCompany`, `useAuth`, or any other hook
- No changes to routing, auth flow, or any other page

