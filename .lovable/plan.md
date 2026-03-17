

# Fix: Audit Photo/File Upload — Bucket Missing + Double-Click Bug

## Problem 1: "Bucket not found"

The code uploads to `supabase.storage.from("audit-field-attachments")` but this bucket does not exist. Existing buckets are: `documents`, `equipment-documents`, `evidence`, `public-assets`, `scout-evidence`, `waste-photos`. None match.

**Fix**: Create the `audit-field-attachments` storage bucket via SQL migration, with RLS policies scoped to the authenticated user's folder path.

## Problem 2: Double-click required to open file picker

In `FieldResponseInput.tsx` lines 63-78, when `fieldResponse?.id` is missing, the first click calls `onObservationChange("")` to trigger a field response creation, then uses `setTimeout(500ms)` to re-click the input. This is fragile — the mutation may not finish in 500ms, or the re-click may be blocked by the browser.

**Fix**: Restructure the upload flow so the field response is created first (awaited), and only then is the file uploaded. This eliminates the double-click issue entirely. The `handlePhotoUpload` and `handleFileUpload` functions should:
1. If no `fieldResponse?.id`, await the parent to create one (expose a callback or use an `onEnsureResponse` prop)
2. Once the response ID is available, proceed with the upload

A simpler approach: make the parent (`LocationAudit.tsx` or the section renderer) always create the field response row as soon as the field is rendered or interacted with, so `fieldResponse?.id` is always available by the time "Add Photo" is clicked.

## Changes

| File | Change |
|------|--------|
| New SQL migration | Create `audit-field-attachments` bucket (public), add INSERT/SELECT/DELETE RLS policies for authenticated users on their own folder |
| `src/components/audit/FieldResponseInput.tsx` | Remove the `setTimeout` hack; add an `onEnsureFieldResponse` callback prop that returns a promise resolving to the response ID; use it before uploading |
| `src/pages/LocationAudit.tsx` (or parent renderer) | Pass `onEnsureFieldResponse` that calls `saveFieldResponse.mutateAsync` and returns the new ID |

## Bucket design

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('audit-field-attachments', 'audit-field-attachments', true);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload audit files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audit-field-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view audit files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'audit-field-attachments');

CREATE POLICY "Users can delete own audit files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audit-field-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
```

