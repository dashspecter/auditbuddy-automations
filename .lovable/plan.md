

# Fix Login Crash + Build Errors

## What Broke & Why

Both issues were introduced by recent changes:
- **Login crash**: The new `ManagerClockInCard` component runs queries during auth transition, causing a React DOM reconciliation error ("removeChild"). Users see "Something went wrong" after entering correct credentials.
- **Build failure**: The `workforce.test.ts` mock methods don't accept arguments, blocking deployment.

## Fixes

### 1. `src/components/dashboard/ManagerClockInCard.tsx`
- Import `loading` (as `authLoading`) from `useAuth()`
- Guard the `useEffect` to skip fetching while `authLoading` is true
- Add `cancelled` flag in the effect cleanup to prevent state updates on unmounted component
- Add `authLoading` to the dependency array

### 2. `supabase/functions/dash-command/capabilities/workforce.test.ts`
- In the hardcoded `from()` mock (lines 36-59), add `..._args: any[]` to every chained method: `select`, `eq`, `ilike`, `or`, `order`, `limit`

## Result
- Login works exactly as before (toast → redirect → dashboard)
- Build succeeds → edge functions deploy automatically
- No other files or flows are affected

| File | Change |
|------|--------|
| `src/components/dashboard/ManagerClockInCard.tsx` | Add auth loading guard + effect cleanup |
| `supabase/functions/dash-command/capabilities/workforce.test.ts` | Add `..._args: any[]` to hardcoded mock methods |

