

# Fix P1 Permission Gap + P2 Registry Cleanup

## Fix 1 — P1: Enforce manager-required on all write-capable modules

**File:** `supabase/functions/dash-command/shared/permissions.ts` (lines 74-83)

Add three new module checks in the `create` case, matching the registry's `manager_required` declarations:

```typescript
case "create":
  if (module === "workforce" && !isManagerLevel(ctx)) {
    return permissionDenied("Only managers or admins can create employees and shifts.");
  }
  if (module === "location_audits" && !isManagerLevel(ctx)) {
    return permissionDenied("Only managers or admins can create audit templates.");
  }
  if (module === "corrective_actions" && !isManagerLevel(ctx)) {
    return permissionDenied("Only managers or admins can create corrective actions.");
  }
  if (module === "cmms" && !isManagerLevel(ctx)) {
    return permissionDenied("Only managers or admins can create work orders.");
  }
  if (module === "tasks" && !isManagerLevel(ctx)) {
    return permissionDenied("Only managers or admins can create tasks.");
  }
  // Time-off and other modules: self-service allowed
  return success(true);
```

## Fix 2 — P2: Normalize registry action names

**File:** `supabase/functions/dash-command/registry.ts`

The `actions` arrays mix naming conventions. Normalize to match actual tool function names as defined in `tools.ts` (draft names for write tools, plain names for direct actions):

- **workforce** (line 75): Already uses draft names — correct
- **corrective_actions** (line 65): Already correct
- **operations** (line 85): Already correct

No actual changes needed — the registry action names already match `tools.ts` function names exactly. The earlier audit flagged a perceived inconsistency, but on re-inspection the names are consistent: tools that go through the draft flow use `_draft` suffix, direct actions (like `reassign_corrective_action`) don't.

**Verdict: P2 is a non-issue. No change needed.**

---

## Files Modified

| File | Change |
|------|--------|
| `shared/permissions.ts` | Add 3 manager-required checks for `corrective_actions`, `cmms`, `tasks` creates |

## Deploy

Redeploy `dash-command` edge function.

