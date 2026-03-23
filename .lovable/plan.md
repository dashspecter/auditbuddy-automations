

# Fix: "Yes" After PDF Extraction Produces Empty Response

## What's happening — step by step

1. **User uploads PDF + "create audit from this"** → Model calls `parse_uploaded_file` with `intent: "audit_template"` ✅
2. **`parse_uploaded_file` succeeds** → Returns extracted template data with `next_step: "Review the extracted template structure and call create_audit_template_draft to finalize."` ✅
3. **Model receives tool result** → Instead of calling `create_audit_template_draft`, it dumps the entire extracted template as plain text and asks "Would you like to create this?" ❌ (Should have chained the second tool call)
4. **User replies "Yes"** → Model returns **empty content** (no text, no tool call). `finalContent = ""`. The fallback mechanism doesn't trigger because the "Yes" message has no `[File URLs:]` marker.
5. **Empty string is streamed** → The stream sends only `finish_reason: "stop"` + `[DONE]` with zero content chunks → blank bubble in UI.

## Why the two-step flow is inherently unreliable

The model must:
- Remember the extracted template data from a previous turn
- Correctly call `create_audit_template_draft` with all the sections/fields as arguments
- Do this based only on the user saying "Yes"

This requires the model to reconstruct a complex JSON payload from its own previous text output. It fails because:
- The template data is too large to reliably echo back as tool arguments
- The model "thinks" it already showed the template, so "Yes" = done
- Gemini sometimes returns empty responses when it has nothing meaningful to add

## The fix — merge extraction + draft creation into one step

When `parse_uploaded_file` successfully extracts a template, it should **immediately create the pending action and emit the approval card** — exactly what `create_audit_template_draft` does. No second tool call needed.

Additionally, add a guard against empty responses so users never see a blank bubble.

### Changes to `supabase/functions/dash-command/index.ts`

**1. In `parse_uploaded_file` (around line 947-952):**

After successful template extraction, instead of returning `next_step: "call create_audit_template_draft"`:
- Build the draft object (name, description, sections)
- Insert into `dash_pending_actions` (same logic as `create_audit_template_draft` at line 1044)
- Push an `action_preview` structured event with approval card data
- Return with `pending_action_id` and `requires_approval: true`

This means the user sees the approval card **immediately** after PDF parsing — one tool call, one approval button, done.

**2. Guard against empty final response (around line 2146):**

After `let finalContent = msg.content || "";`, add:
```
if (!finalContent.trim() && allStructuredEvents.length === 0) {
  finalContent = "I'm ready to help. Could you clarify what you'd like me to do?";
}
```

This prevents blank bubbles regardless of cause.

**3. Keep `create_audit_template_draft` as a tool** for manual template creation (without PDF), but it's no longer needed in the PDF flow.

## Files to change

| File | Change |
|------|--------|
| `supabase/functions/dash-command/index.ts` | Merge draft creation into `parse_uploaded_file` for audit intents; add empty-response guard |

## Expected flow after fix

1. User uploads PDF + "create audit" → `parse_uploaded_file` called
2. PDF downloaded, sent to Gemini, template extracted
3. **Same tool call** inserts pending action + emits approval card
4. User clicks "Approve" button on card → `execute_audit_template_creation` runs
5. Done — no second LLM tool call required

