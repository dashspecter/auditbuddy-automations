

# Fix Password Reset + Build Errors

## Problem
The "Reset Password" action fails with "Edge Function returned a non-2xx status code" because the edge functions **cannot deploy** — there are TypeScript build errors in 4 dash-command capability files that block deployment of ALL edge functions (they share a build context).

## Root Cause
Four files still use the **old 3-argument** `checkCapabilityPermission(ctx, action, module)` signature with `.allowed`/`.reason` properties, but the function was refactored to use an **object-based** signature `checkCapabilityPermission({ action, module, ctx })` with `.ok` property.

## Fix — Update 4 Files

All changes follow the same pattern — convert every call site from:
```typescript
// OLD (broken)
const permCheck = checkCapabilityPermission(ctx, "create", "module_name");
if (!permCheck.allowed) return capabilityError(permCheck.reason ?? "Permission denied.");
```
to:
```typescript
// NEW (correct)
const permCheck = checkCapabilityPermission({ action: "create", module: "module_name", ctx });
if (!permCheck.ok) return permCheck;
```

### Files and call counts:
1. **`supabase/functions/dash-command/capabilities/marketplace.ts`** — 2 calls (lines 56-57, 114-115)
2. **`supabase/functions/dash-command/capabilities/messaging.ts`** — 4 calls (lines 113-114, 205-206, 257-258, 306-307)
3. **`supabase/functions/dash-command/capabilities/operations.ts`** — 6 calls (lines 2251-2252, 2321-2322, 2487-2488, 2552-2553, 2674-2675, 2724-2725)
4. **`supabase/functions/dash-command/capabilities/scouts.ts`** — 2 calls (lines 339-340, 404-405)

## Result
- Build errors resolved → edge functions deploy successfully
- Password reset via `update-user` function works again
- No changes to permissions logic, auth flow, kiosk, dashboard, or any UI components

