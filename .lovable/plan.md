

# Fix: Contract Generation "Failed to download template file"

## The Flow

1. **Upload** (`ContractTemplateDialog.tsx`): Uploads `.docx` to private `documents` bucket at `{companyId}/contract-templates/{fileName}`, then stores `getPublicUrl()` result as `file_url` in the `documents` table.

2. **Generate** (`GenerateContractDialog.tsx`): Calls the `ai-fill-contract` edge function with `employee_id` and `template_id`.

3. **Edge function** (`ai-fill-contract/index.ts` line 376): Fetches the template via `fetch(template.file_url)` — a plain HTTP GET to the public URL.

## Root Cause

The `documents` storage bucket is **private**. `getPublicUrl()` returns a URL, but private buckets reject unauthenticated requests with 400/403. So the edge function's `fetch()` fails → "Failed to download template file".

## The Fix

**In the edge function** (`ai-fill-contract/index.ts`), instead of fetching the public URL, use the Supabase storage SDK (with the service role client that's already created) to download the file directly:

1. Extract the storage path from `file_url` (everything after `/documents/`)
2. Replace `fetch(template.file_url)` with `supabaseService.storage.from('documents').download(filePath)`
3. Convert the returned Blob to `Uint8Array`

This approach works regardless of bucket visibility and uses the service role which bypasses storage RLS.

### Lines ~375-381 change from:
```typescript
const templateResponse = await fetch(template.file_url);
if (!templateResponse.ok) {
  throw new Error("Failed to download template file");
}
const templateBuffer = new Uint8Array(await templateResponse.arrayBuffer());
```

### To:
```typescript
// Extract storage path from the public URL
const urlParts = template.file_url.split('/documents/');
const storagePath = decodeURIComponent(urlParts[urlParts.length - 1]);

const { data: fileData, error: downloadError } = await supabaseService
  .storage.from('documents').download(storagePath);

if (downloadError || !fileData) {
  throw new Error("Failed to download template file: " + (downloadError?.message || "unknown"));
}
const templateBuffer = new Uint8Array(await fileData.arrayBuffer());
```

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/ai-fill-contract/index.ts` | Replace `fetch(url)` with `supabaseService.storage.download()` |

One file, one change. No migration needed.

