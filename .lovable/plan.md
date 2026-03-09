
## What’s happening (deep dive)

You fixed the first issue (private template download), but generation now fails at the **next step**:

1. UI calls backend function `ai-fill-contract`
2. Function authenticates user + scopes to company
3. Function downloads template file successfully
4. Function tries to open DOCX ZIP and read `word/document.xml`
5. It crashes with:
   `Failed to construct 'DecompressionStream' ... 'raw-deflate' is not valid`
6. Backend returns 500, frontend shows generic toast: **“Edge Function returned a non-2xx status code”**

So this is a **new blocker in ZIP decompression**, not the old storage access bug.

---

## Root cause

In `supabase/functions/ai-fill-contract/index.ts`, the custom ZIP parser uses:

- `new DecompressionStream("raw-deflate" as any)`

That compression format string is invalid in this runtime.  
DOCX entries are deflated ZIP entries, so decompressing `word/document.xml` fails before AI replacement begins.

---

## Smart fix plan (safe + durable)

1. **Patch decompression format usage in all locations**
   - Replace invalid `"raw-deflate"` with runtime-compatible raw-deflate handling.
   - Apply consistently in:
     - ZIP parse/read path
     - ZIP rebuild path

2. **Centralize decompression into one helper**
   - Add `decompressZipDeflate()` utility instead of repeated inline DecompressionStream code.
   - Include clear error text when decompression fails (file name + compression method).

3. **Harden DOCX parsing flow**
   - Validate `word/document.xml` exists.
   - If not found or unsupported compression method, return explicit 4xx/5xx JSON error (not generic throw).
   - Keep tenant/company scoping unchanged.

4. **Improve frontend error visibility**
   - In `GenerateContractDialog`, parse backend JSON error message from function invoke failures.
   - Show meaningful toast (e.g., “Template ZIP decompression failed”) instead of generic non-2xx.

5. **Verify end-to-end**
   - Generate contract using at least 2 templates (one recently uploaded, one older).
   - Confirm:
     - no 500 in logs
     - docx downloads
     - replacements count is returned
     - re-open/regenerate works repeatedly

---

## Technical details

- **Files to update**
  - `supabase/functions/ai-fill-contract/index.ts`
  - `src/components/GenerateContractDialog.tsx` (error parsing only)

- **No database migration needed**
  - This is function/runtime + client error handling only.

- **Why this is “smart”**
  - Fixes immediate runtime crash
  - Prevents future silent failures via explicit parsing/decompression errors
  - Gives actionable UI feedback instead of opaque generic errors
