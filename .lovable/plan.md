

# Fix: PDF Document Parsing Fails in Dash

## Root Causes (3 issues)

### Issue 1 — PDF sent as `image_url` to Gemini (PRIMARY)
In `parse_uploaded_file` (line 856) and `transform_compliance_doc_to_audit` (line 1742), the file URL is sent as:
```
{ type: "image_url", image_url: { url: file_url } }
```
PDFs are **not images**. Gemini's `image_url` content type only accepts image formats (PNG, JPEG, GIF, WebP). A PDF URL here causes the API call to fail or return garbage, which then fails the JSON extraction — producing the "unable to parse" error the user sees.

### Issue 2 — Signed URLs may expire or be inaccessible
The file URL from the screenshot is a **signed Supabase storage URL** (`/storage/v1/object/sign/...`). These URLs have an expiry token. When the edge function fetches the URL, it may have expired, or the AI gateway may not be able to access it at all.

### Issue 3 — `parse-document` edge function is a stub
The existing `parse-document` function (line 68-72) just does `TextDecoder` on raw bytes — which produces garbage for PDFs. It even says: *"Document parsing requires additional processing."* It's never used by Dash anyway.

## Solution

### A) Download PDF server-side, convert to base64, send to Gemini as inline data

Instead of passing the URL to Gemini (which may not be accessible), the edge function should:
1. Download the PDF from Supabase Storage using the service role key
2. Convert to base64
3. Send as inline content with `type: "file"` / proper MIME type to Gemini

Gemini 2.5 Flash supports PDF files natively via inline data:
```typescript
{
  type: "image_url",
  image_url: {
    url: `data:application/pdf;base64,${base64Content}`
  }
}
```

### B) Apply to all 3 places that process documents

1. `parse_uploaded_file` with `intent === "audit_template"` (line 845-873)
2. `transform_compliance_doc_to_audit` (line 1730-1762)
3. `convert_sop_to_training` (if it exists with similar pattern)

### C) Extract a shared helper function

Create a `downloadFileAsBase64(supabaseClient, fileUrl)` helper at the top of `dash-command/index.ts` that:
- Parses the storage URL (handles `/sign/`, `/public/`, and direct paths)
- Downloads via Supabase Storage SDK using service role
- Returns `{ base64: string, mimeType: string }`
- Falls back to direct HTTP fetch for external URLs

### D) Better error handling

- If download fails: return a clear error "Could not access the uploaded file. Please try re-uploading."
- If Gemini returns no parseable JSON: return the raw text extraction so the user can see what was found
- Log the actual Gemini response status/error for debugging

## File Changes

| File | Change |
|------|--------|
| `supabase/functions/dash-command/index.ts` | Add `downloadFileAsBase64` helper; update `parse_uploaded_file`, `transform_compliance_doc_to_audit`, and `convert_sop_to_training` to download PDF and send as base64 inline data instead of URL |

## Expected Behavior After Fix

1. User attaches "LBFC FOH SOP.pdf" and says "create an audit from this"
2. Dash downloads the PDF server-side from Supabase Storage
3. Converts to base64 and sends to Gemini as inline PDF data
4. Gemini reads the PDF content and extracts a structured audit template
5. Dash presents an approval card with template name, sections, and fields
6. User approves → template is created

