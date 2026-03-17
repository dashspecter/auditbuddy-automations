

# Plan: Bulletproof Audit Module — Zero Data Loss Guarantee

## Problems found

After a full audit of every write path, here are the remaining vulnerabilities that can cause data loss or RLS errors during a multi-hour audit session:

### Critical: No session refresh before writes

| Write path | File | Has `refreshSession()`? |
|---|---|---|
| `LocationAudit.handleSubmit` → `performSubmit()` | `src/pages/LocationAudit.tsx` | **NO** |
| `LocationAudit.handleSaveDraft` | `src/pages/LocationAudit.tsx` | **NO** |
| `LocationAudit.createInitialDraft` | `src/pages/LocationAudit.tsx` | **NO** |
| `useUpdateAudit` | `src/hooks/useAuditsNew.ts` | **NO** |
| `useCompleteAudit` | `src/hooks/useAuditsNew.ts` | **NO** |
| `useCreateAudit` | `src/hooks/useAuditsNew.ts` | **NO** |
| `useDeleteFieldPhoto` | `src/hooks/useAuditFieldResponses.ts` | **NO** |
| `useDeleteFieldAttachment` | `src/hooks/useAuditFieldResponses.ts` | **NO** |
| `useSaveFieldResponse` | `src/hooks/useAuditFieldResponses.ts` | ✅ |
| `useSaveSectionResponse` | `src/hooks/useAuditSectionResponses.ts` | ✅ |
| `useUploadFieldPhoto` | `src/hooks/useAuditFieldResponses.ts` | ✅ |
| `useUploadFieldAttachment` | `src/hooks/useAuditFieldResponses.ts` | ✅ |

### Medium: No retry on transient failure

Every field save in the LocationAudit page fires `saveFieldResponse.mutate()` with no retry. If the network blips during a 2-hour audit, that single field value is silently lost. The mutation has `retry: 0` by default (TanStack Query mutation default).

### Medium: `useSaveFieldResponse` has no offline queue

When offline, clicking YES/NO fires the mutation, it fails, shows an error toast, and the value is lost from the server. The local `formData.customData` state has it, but the `audit_field_responses` row does not. If the user closes the tab, the IndexedDB draft has the `customData` but not the server-side field responses.

### Low: `PerformAudit.tsx` completion has no session guard

`useCompleteAudit` and `useUpdateAudit` (used in `PerformAudit.tsx`) have zero session refresh. After hours of work, completing the audit will fail with an RLS error.

## Fixes

### 1. Add session refresh to ALL remaining write hooks (`useAuditsNew.ts`)

Add `refreshSession()` + `getUser()` guard to `useCreateAudit`, `useUpdateAudit`, and `useCompleteAudit` mutations — same pattern as the field response hooks.

### 2. Add session refresh to `LocationAudit.tsx` submission

Add `refreshSession()` at the top of `performSubmit()`, `handleSaveDraft()`, and `createInitialDraft()`.

### 3. Add session refresh to delete mutations (`useAuditFieldResponses.ts`)

Add the guard to `useDeleteFieldPhoto` and `useDeleteFieldAttachment`.

### 4. Add automatic retry to all field-save mutations

Configure TanStack Query mutation `retry: 2` with `retryDelay: 1000` on `useSaveFieldResponse`, `useSaveSectionResponse`, `useUploadFieldPhoto`, and `useUploadFieldAttachment`. This handles transient network failures transparently.

### 5. Add offline-aware save queue for field responses

In `LocationAudit.tsx` `handleFieldChange`, wrap the `saveFieldResponse.mutate()` call: if `!navigator.onLine`, skip the server write silently (the value is already in `formData.customData` and will be persisted to IndexedDB by the draft hook). When the app comes back online, trigger a bulk re-save of all `customData` fields. Use the existing `useAppVisibility` hook's `onVisible` callback to trigger this.

### 6. Add a visible "last saved" indicator

Show a small timestamp ("Last saved: 2 min ago") at the top of the LocationAudit form so users have confidence their data is persisting. Use the draft's `savedAt` timestamp.

## Files changed

| File | Change |
|------|--------|
| `src/hooks/useAuditsNew.ts` | Add `refreshSession()` guard to all 3 mutations, add `retry: 2` |
| `src/hooks/useAuditFieldResponses.ts` | Add `refreshSession()` to delete mutations, add `retry: 2` to save/upload mutations |
| `src/hooks/useAuditSectionResponses.ts` | Add `retry: 2` to save mutation |
| `src/pages/LocationAudit.tsx` | Add `refreshSession()` to `performSubmit`, `handleSaveDraft`, `createInitialDraft`; add offline-aware field save; add "last saved" indicator; add online-resume bulk re-save |
| `src/pages/audits/PerformAudit.tsx` | No changes needed (already uses hooks that will be fixed) |

## What does NOT change
- No database or RLS policy changes
- No changes to the draft storage system (IndexedDB/localStorage) — it already works correctly
- No changes to auth context or routing
- No changes to the template builder or report pages

