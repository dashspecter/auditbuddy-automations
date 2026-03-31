

# Fix All Build Errors

## 4 Issues to Fix

### 1. `src/hooks/useDashChat.ts` — Duplicate declarations (lines 283-288)
Lines 273-281 and 283-288 declare `displayMessages`, `hasMoreHistory`, and `loadMoreHistory` twice. **Delete lines 283-288** (the duplicate block).

### 2. `src/hooks/useAudits.ts` (line 60), `useRealtimeShifts.ts` (line 11), `useEmployeePerformance.ts` (line 93) — Wrong destructuring
`useCompany()` returns a TanStack Query result (with `.data`), not `{ company }`. These files destructure as `const { company } = useCompany()` which is wrong.
**Fix:** Change to `const { data: company } = useCompany()` in all three files.

### 3. `supabase/functions/dash-command/capabilities/workforce.test.ts` — Already fixed
The mock already has `..._args: any[]` on all methods (confirmed in lines 17-24). The build error shows it's using the **old mock structure** (lines 32-46) which has a hardcoded chain without the generic `chainable()` helper for the `employees` table. The hardcoded `eq` returns an object with `ilike` and `or`, but TypeScript can't determine which branch is taken, so it errors on `.ilike()`.

**Fix:** Replace the hardcoded `from("employees")` branch to use the generic `chainable()` helper, same pattern as the top-level chainable function.

## Files

| File | Change |
|------|--------|
| `src/hooks/useDashChat.ts` | Delete duplicate lines 283-288 |
| `src/hooks/useAudits.ts` | `const { data: company } = useCompany()` |
| `src/hooks/useRealtimeShifts.ts` | `const { data: company } = useCompany()` |
| `src/hooks/useEmployeePerformance.ts` | `const { data: company } = useCompany()` |
| `supabase/functions/dash-command/capabilities/workforce.test.ts` | Use `chainable()` for employees table mock |

