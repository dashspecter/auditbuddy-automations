

# Fix Dash Shift & CA Execution — 3 Issues

## What's Wrong

1. **Missing tool definitions**: `execute_shift_creation` and `execute_ca_reassignment` have backend handlers but NO tool definitions in the tools array. The LLM cannot call tools it doesn't know exist.
2. **Wrong columns in shift INSERT**: Handler inserts `employee_id` (doesn't exist on `shifts` table) and misses `role` (required, NOT NULL).
3. **System prompt incomplete**: Shift and CA reassignment instructions don't mention the execute tools by name.

## Fix 1 — Add `execute_shift_creation` tool definition

**File**: `supabase/functions/dash-command/index.ts` (after line 469, after `create_shift_draft`)

Add a new tool definition:
```typescript
{
  type: "function",
  function: {
    name: "execute_shift_creation",
    description: "Execute shift creation after user approves the draft. Only call after explicit user confirmation.",
    parameters: {
      type: "object",
      properties: {
        pending_action_id: { type: "string", description: "The pending action ID from the shift draft" },
      },
      required: ["pending_action_id"],
    },
  },
},
```

## Fix 2 — Add `execute_ca_reassignment` tool definition

**File**: `supabase/functions/dash-command/index.ts` (after line 448, after `reassign_corrective_action`)

Add a new tool definition:
```typescript
{
  type: "function",
  function: {
    name: "execute_ca_reassignment",
    description: "Execute corrective action reassignment after user approves. Only call after explicit confirmation.",
    parameters: {
      type: "object",
      properties: {
        pending_action_id: { type: "string", description: "The pending action ID from the reassignment draft" },
      },
      required: ["pending_action_id"],
    },
  },
},
```

## Fix 3 — Correct shift INSERT columns

**File**: `supabase/functions/dash-command/index.ts` (lines 1373-1383)

Replace the INSERT with correct `shifts` table columns:
```typescript
const { data: shiftData, error: shiftError } = await sbService.from("shifts").insert({
  company_id: companyId,
  location_id: draft.location_id,
  role: draft.role,
  shift_date: draft.shift_date,
  start_time: draft.start_time,
  end_time: draft.end_time,
  required_count: draft.min_staff || 1,
  shift_type: draft.shift_type || "regular",
  notes: draft.notes || null,
  created_by: userId,
}).select("id, shift_date, start_time, end_time").single();
```

## Fix 4 — Update system prompt instructions

**File**: `supabase/functions/dash-command/index.ts` (lines 1666-1672)

Update CA reassignment and shift creation instructions to reference execute tools:

**CA Reassignment** (line 1666-1668):
```
**Corrective Action Reassignment:**
1. Use `reassign_corrective_action` to create a draft showing impact
2. Wait for user approval
3. Call `execute_ca_reassignment` with the pending_action_id
```

**Shift Creation** (line 1670-1672):
```
**Shift Creation Flow:**
1. Use `create_shift_draft` to prepare and show preview
2. Wait for user approval
3. Call `execute_shift_creation` with the pending_action_id
```

## Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/dash-command/index.ts` | Add 2 tool definitions, fix shift INSERT columns, update system prompt |

## Delivery
Single edit + redeploy of `dash-command` edge function.

