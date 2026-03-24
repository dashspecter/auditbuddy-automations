

# Fix All Remaining Audit Issues

Five concrete fixes, all in the `dash-command` edge function.

---

## Fix 1 — P0: Define `corsHeaders` (index.ts)

Add the CORS constant after the imports (before `TOOL_MODULE_MAP`). It's referenced 58 times but never declared.

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

Insert at line 30, before the `TOOL_MODULE_MAP` declaration.

---

## Fix 2 — P1: Tighten `create` permission (shared/permissions.ts)

Currently line 74-77 allows ALL roles to create anything. Change to require manager-level for `workforce` and `location_audits` creates, while keeping time-off as self-service:

```typescript
case "create":
  if (module === "workforce" && !isManagerLevel(ctx)) {
    return permissionDenied("Only managers or admins can create employees and shifts.");
  }
  if (module === "location_audits" && !isManagerLevel(ctx)) {
    return permissionDenied("Only managers or admins can create audit templates.");
  }
  return success(true);
```

---

## Fix 3 — P1: Add `company_id` filter to `getOrgMemory` (memory.ts)

Update function signature to accept `companyId` and add `.eq("company_id", companyId)` to the query. Update the call site in `index.ts` line 332 to pass `companyId`.

---

## Fix 4 — P1: Add `company_id` filter to `getAuditResults` (audits.ts)

Add `.eq("company_id", companyId)` to the query chain at line 20 (the `companyId` param already exists but is unused).

---

## Fix 5 — P1: Wrap time-off orchestration returns in `resultToToolResponse`

In `index.ts`, wrap the raw return objects at:
- Line 451-460 (`create_time_off_request_draft`) → wrap in `resultToToolResponse(success(...))`
- Line 464 (error path) → wrap in `resultToToolResponse(capabilityError(...))`
- Line 533 (not found error) → same
- Line 534 (status error) → same
- Line 566-572 (approval draft return) → wrap in `resultToToolResponse(success(...))`
- Line 576 (missing id error) → same
- Line 636-637 (unknown tool default) → wrap in `resultToToolResponse(capabilityError(...))`

Import `success` and `capabilityError` from contracts (already imported: `resultToToolResponse`).

---

## Files Modified

| File | Changes |
|------|---------|
| `index.ts` | Add `corsHeaders` constant; add `success`/`capabilityError` imports; wrap all raw time-off returns; pass `companyId` to `getOrgMemory` |
| `shared/permissions.ts` | Tighten `create` case with module-specific checks |
| `capabilities/memory.ts` | Add `companyId` param + filter to `getOrgMemory` |
| `capabilities/audits.ts` | Add `.eq("company_id", companyId)` to `getAuditResults` query |

