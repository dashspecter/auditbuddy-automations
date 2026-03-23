

# Fix: PDF Audit Template Creation + Dash Width

## Two Issues

### Issue 1: PDF parsing — model doesn't call the right tool (or any tool at all)

**Root cause**: Tool confusion + model deciding not to call tools.

The system prompt describes two overlapping tools for "create audit from PDF":
- `parse_uploaded_file` with `intent: "audit_template"` — the correct path
- `transform_compliance_doc_to_audit` — a separate compliance-specific tool

The model gets confused between them and sometimes responds with text ("I cannot create an audit directly...") WITHOUT calling either tool.

Additionally, the user's message embeds file URLs as plain text in the content. The model must extract the URL and pass it as a tool argument — but it sometimes fails to do this, especially when confused about which tool to use.

**Fix — Consolidate and clarify tool routing:**

1. **Remove `transform_compliance_doc_to_audit` as a separate tool** — merge its capability into `parse_uploaded_file` with a new intent value (`"compliance_audit"`). This eliminates the overlapping tools that confuse the model.

2. **Update the system prompt** to clearly state: "When a user uploads a PDF and asks for an audit template, ALWAYS use `parse_uploaded_file` with intent `audit_template`. Do NOT respond without calling a tool when a file is attached."

3. **Add a server-side fallback**: If the model's first response contains text about "unable to parse" or "cannot create" AND the user message contains `[File URLs:`, intercept and force a `parse_uploaded_file` call instead of returning the model's excuse text.

4. **Add more logging** in `downloadFileAsBase64` and `parse_uploaded_file` so we can see exactly where failures happen.

5. **Handle the Gemini base64 PDF content type correctly**: The Lovable AI gateway proxies to Gemini. Gemini 2.5 Flash supports PDFs as inline data, but the content part format needs to use `inline_data` structure, not `image_url`. Currently the code sends:
```json
{ "type": "image_url", "image_url": { "url": "data:application/pdf;base64,..." } }
```
This may not work reliably with all gateway configurations. We should also try the `inline_data` format as a fallback, or switch entirely to it.

### Issue 2: Dash Command Center width too narrow

**Root cause**: `max-w-3xl` (768px) on the main container and `mr-4` on assistant message bubbles make text truncate.

**Fix**:
- Change `max-w-3xl` to `max-w-5xl` on the main container in `DashWorkspace.tsx`
- Remove `mr-4` from assistant message bubbles in `DashMessageList.tsx`
- Ensure user message bubbles also have reasonable width (`ml-8` instead of `ml-10`)

## Files to change

| File | Change |
|------|--------|
| `supabase/functions/dash-command/index.ts` | Consolidate `transform_compliance_doc_to_audit` into `parse_uploaded_file`; update system prompt to be unambiguous about file handling; add server-side fallback for failed file tool routing; add logging |
| `src/pages/DashWorkspace.tsx` | Change `max-w-3xl` to `max-w-5xl` |
| `src/components/dash/DashMessageList.tsx` | Remove `mr-4` from assistant bubbles; reduce `ml-10` to `ml-8` for user bubbles |

## Expected result
- PDF upload + "create audit" → model always calls `parse_uploaded_file` with correct intent
- PDF is downloaded server-side, sent as base64 to Gemini, structured template extracted
- Dash chat area is wider so all text is visible without truncation

