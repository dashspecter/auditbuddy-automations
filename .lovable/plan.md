

# Implementation Plan: AI-Powered ID Scan + Smart Contract Fill

## Overview

Two new edge functions and one new UI component. The existing `GenerateContractDialog` gets simplified to call the AI backend instead of using client-side docxtemplater.

## What Gets Built

### 1. Edge Function: `scan-id-document`

Receives a base64 image of an ID document. Calls Gemini 2.5 Flash (multimodal vision) via Lovable AI Gateway with tool calling to extract structured fields. Returns JSON with extracted employee data.

- Validates auth via `getClaims()`
- Verifies user belongs to a company via `company_users` table
- Sends image to `google/gemini-2.5-flash` with a Romanian-aware system prompt
- Uses tool calling to get structured output: `full_name`, `cnp`, `domiciliu`, `localitate`, `serie_id`, `numar_id`, `emisa_de`, `valabila_de_la`, `valabilitate_id`, `is_foreign`, `nr_permis_sedere`, `permis_institutie_emitenta`, `permis_data_eliberare`, `permis_data_expirare`, `numar_aviz`, `aviz_institutie`, `aviz_data_eliberare`
- Auto-detects document type (CI vs passport vs residence permit)

### 2. Component: `ScanIdDocumentButton`

Placed at the top of the "Date Contract / Buletin" collapsible in `EmployeeDialog`.

- Camera/file upload button (accepts jpg, png, heic)
- Sends base64 image to `scan-id-document` edge function
- Shows a review dialog with extracted fields side-by-side with current values
- User confirms which fields to apply → auto-fills `formData`
- Handles loading, error, and rate-limit states

### 3. Edge Function: `ai-fill-contract`

Receives `employee_id` + `template_id`. Downloads the DOCX template, extracts XML text, sends it to Gemini 3 Flash with all employee data, gets back text replacements, applies them to the XML in-place, returns base64 DOCX.

- Validates auth and company membership
- Fetches employee data using service role (all fields)
- Downloads DOCX from storage, parses ZIP, extracts `word/document.xml`
- Sends document text + employee data to `google/gemini-3-flash-preview` with tool calling
- AI returns `{ replacements: [{ original, replacement }] }`
- Applies replacements to XML, re-zips, returns base64 blob
- Handles 429/402 errors

### 4. Update: `GenerateContractDialog`

- Remove client-side docxtemplater/PizZip logic
- Call `ai-fill-contract` edge function via `supabase.functions.invoke()`
- Convert returned base64 to blob, trigger download with `saveAs`
- Show progress state ("AI is analyzing your contract...")

### 5. Update: `EmployeeDialog`

- Import and render `ScanIdDocumentButton` at the top of the contract data collapsible (line ~440)
- Pass callback to update `formData` with scanned values

### 6. Config: `supabase/config.toml`

Add both new functions:
```toml
[functions.scan-id-document]
verify_jwt = false

[functions.ai-fill-contract]
verify_jwt = false
```

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/scan-id-document/index.ts` | Create |
| `supabase/functions/ai-fill-contract/index.ts` | Create |
| `src/components/ScanIdDocumentButton.tsx` | Create |
| `src/components/EmployeeDialog.tsx` | Update — add scan button |
| `src/components/GenerateContractDialog.tsx` | Update — use edge function |
| `supabase/config.toml` | Update — add 2 functions |

No database changes needed — all employee fields already exist.

## Security

- Both edge functions validate JWT via `getClaims()` and verify company membership
- Employee data fetched with company_id scoping (service role + explicit filter)
- Template access scoped to user's company via `company_users` lookup
- No cross-company data exposure possible

