

# Fix: "workforce module is not active" Error on Direct Approval

## Root Cause

The direct approval path (line 1907-1910) in `dash-command/index.ts` passes an **empty array `[]`** for `activeModules` when calling `executeTool`. The module gating check on line 642-644 then sees that `"workforce"` is not in `[]` and blocks execution with the error message.

The normal LLM path correctly loads active modules from the database (line 1985-1986), but the direct approval shortcut added in the previous fix skips that step entirely.

## Fix

### File: `supabase/functions/dash-command/index.ts`

**In the direct approval path (around line 1907)**, load the company's active modules from the database before calling `executeTool`:

```typescript
// ─── DIRECT APPROVAL PATH (bypasses LLM) ───
if (direct_approval?.pending_action_id && direct_approval?.action === "approve") {
  // Load active modules (required for gating check)
  const { data: modulesData } = await sb
    .from("company_modules")
    .select("module_name")
    .eq("company_id", companyId)
    .eq("is_active", true);
  const activeModules = (modulesData ?? []).map((m: any) => m.module_name);

  const allStructuredEvents: string[] = [];
  const toolName = direct_approval.execute_tool || "execute_shift_creation";
  const toolResult = await executeTool(
    sb, sbService, toolName,
    { pending_action_id: direct_approval.pending_action_id },
    companyId, userId, displayRole, activeModules, allStructuredEvents
  );
  // ... rest unchanged
}
```

That is the only change needed. The empty `[]` on line 1910 is why every direct approval fails the module gate.

## Secondary Note

The `execute_tool` default on line 1909 (`|| "execute_shift_creation"`) is fragile — if a non-shift pending action (e.g., employee creation) is approved, it would call the wrong executor. But this is a separate concern; for now it works because only shift creation uses direct approval. Worth noting for future hardening.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/dash-command/index.ts` | Load `activeModules` from DB before `executeTool` in the direct approval path |

