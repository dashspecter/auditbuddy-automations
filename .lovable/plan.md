

# Fix Build Errors

## 5 Errors to Fix

### 1. `check-task-notifications/index.ts` — implicit `any` type
Line 163: `(e) => e.id` needs type annotation → `(e: any) => e.id`

### 2. `workforce.test.ts` — mock chain doesn't support arguments
The mock's `select()`, `eq()` etc. accept no args but tests pass args. Fix: add `..._args: any[]` params to mock chain methods.

### 3. `DashMessageList.tsx` — boolean in table rows
`rows` contains booleans but type expects `(string | number)[][]`. Fix: cast or convert booleans to strings in the data.

### 4. `DashLocaleContext.tsx` — `t` type mismatch (ro vs en literal strings)
`t` is typed as `typeof DASH_STRINGS["en"]` but Romanian strings have different literal types. Fix: widen the type to `(typeof DASH_STRINGS)[DashLocale]` or use a non-const interface.

### 5. `useDashChat.ts` — `invalidate_keys` not in type
The `execution_result` event data type doesn't include `invalidate_keys`. Fix: extend the type or use optional chaining with type assertion.

## Files

| File | Change |
|------|--------|
| `supabase/functions/check-task-notifications/index.ts` | Add `: any` type to map callback |
| `supabase/functions/dash-command/capabilities/workforce.test.ts` | Fix mock to accept arguments |
| `src/components/dash/DashMessageList.tsx` | Fix boolean type in table rows |
| `src/contexts/DashLocaleContext.tsx` | Widen `t` type to support both locales |
| `src/hooks/useDashChat.ts` | Add type assertion for `invalidate_keys` |

