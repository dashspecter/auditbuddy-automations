

# Fix: Contract Template Upload RLS Violation

## Root Cause

The storage bucket `documents` has an INSERT policy:
```
folder_name[1] = get_user_company_id(auth.uid())
```

But `ContractTemplateDialog.tsx` uploads to:
```
contract-templates/${fileName}
```

The first path segment is `contract-templates` instead of the company ID → **RLS rejects the upload**.

## The Fix

In `ContractTemplateDialog.tsx`, restructure the upload flow:

1. **Move the company_id lookup BEFORE the storage upload** (currently it happens after)
2. **Change the file path** from `contract-templates/${fileName}` to `${companyId}/contract-templates/${fileName}`
3. Update the `file_url` and delete logic to use the new path structure

This matches the pattern used by other storage uploads in the app (waste-photos, equipment-documents all use `company_id` as the first folder).

## Files Changed

| File | Change |
|------|--------|
| `src/components/ContractTemplateDialog.tsx` | Reorder `handleUpload` to fetch company_id first, prefix upload path with company_id |

One file, small reorder of existing logic. No backend/migration changes needed.

