

# Fix: Dash Correctness Issues Found in Live Testing

## Issues Identified from Screenshots

### Issue 1: `due_date` column error on corrective actions drill-down
**Screenshot 1**: User asks "yes, please" to break down corrective actions. Dash returns: *"issue with accessing the due_date column"*.

**Root cause**: The `corrective_actions` table uses `due_at`, not `due_date`. The `get_open_corrective_actions` tool selects `due_date` (line 879) and maps it in the return (line 886). When the LLM tries to drill deeper and queries by severity, the same wrong column name causes a Postgres error.

**Fix**: In `index.ts` lines 879 and 886, change `due_date` to `due_at`.

---

### Issue 2: Audit template created without approval card — user can't approve via button
**Screenshot 2-3**: User asks "Create an audit template named TestDash with 3 sections: Safety, Cleanliness, Equipment". Dash responds with a text draft preview AND appends "✅ Audit template 'TestDash' created successfully!" in the same message — meaning the template was **created immediately without waiting for approval**.

Then user types "Confirm" and Dash doesn't know what to confirm because the template was already created inline.

**Root cause**: The LLM is calling `create_audit_template_draft` which correctly creates a pending action and emits an `action_preview` structured event. But the LLM then **also calls `execute_audit_template_creation` in the same tool-call iteration** — it doesn't wait for user approval. The action_preview card with the Approve button IS being emitted, but by the time streaming completes, execution has already happened. The card likely shows but the "✅ created successfully" text at the end of the message makes it look like everything happened automatically.

This is actually a **system prompt issue** — the LLM needs to be explicitly told: after calling a draft tool, STOP and wait. Do NOT call the execute tool in the same turn.

**Fix**: Strengthen the system prompt instructions to explicitly forbid calling execute tools in the same iteration as draft tools. Add a guard in the tool-call loop: if a draft tool was just called, skip any execute tool calls in the same iteration.

---

### Issue 3: No approval card visible in the UI
Looking at screenshots 2-3 more carefully, there's no `ActionPreviewCard` rendered. The structured event was emitted but the content text includes "Please confirm if you'd like to create this audit template. ✅ Audit template "TestDash" created successfully!" — this means both the draft AND execute happened in one turn. The action_preview card may have been emitted but immediately followed by execution_result, and since both are in the same message, the card's pending_action_id already resolves to "approved" status.

**Fix**: The backend tool loop guard is the real fix. After any `_draft` tool call, force-break the tool iteration loop so the LLM cannot call execute in the same turn.

---

## File Changes

| File | Changes |
|------|---------|
| `supabase/functions/dash-command/index.ts` | (1) Fix `due_date` → `due_at` in `get_open_corrective_actions`. (2) Add guard in tool-call loop: if a `_draft` tool was called, break the loop to prevent same-turn execution. (3) Strengthen system prompt to explicitly forbid same-turn draft+execute. |

## Implementation Details

### Change 1: Column name fix (lines 879, 886)
```
due_date → due_at
```

### Change 2: Draft-breaks-loop guard
In the tool-call iteration loop, after processing tool results, check if any tool name ends with `_draft`. If so, append a system message telling the LLM to stop and present the draft, then break the inner loop.

### Change 3: System prompt reinforcement
Add explicit instruction: "CRITICAL: After calling any draft tool (create_audit_template_draft, create_employee_draft, create_shift_draft, reassign_corrective_action), you MUST stop tool calling and present the draft to the user. Do NOT call any execute tool in the same turn. Wait for user approval via the approval card."

