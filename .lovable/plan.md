

# Evidence Review: Status Not Updating After Approval

## Root Cause

Query cache invalidation mismatch. Two different query keys are in play:

1. **List page** (`EvidenceReview.tsx`): uses `["evidence_packets_all", companyId]`
2. **Review mutation** (`useEvidencePackets.ts` → `useReviewEvidencePacket`): invalidates `["evidence_packets", subjectType, subjectId]`

After approving/rejecting, only the per-subject query is invalidated. The list page's query is never told to refetch, so it keeps showing "Pending review" until a manual refresh.

## Fix

**File: `src/hooks/useEvidencePackets.ts`** — in `useReviewEvidencePacket`'s `onSuccess`, add invalidation for the list query:

```typescript
onSuccess: (_, args) => {
  queryClient.invalidateQueries({ queryKey: ["evidence_packets", args.subjectType, args.subjectId] });
  queryClient.invalidateQueries({ queryKey: ["evidence_packets_all"] }); // ← ADD THIS
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
  queryClient.invalidateQueries({ queryKey: ["task_completions"] });
},
```

One line added to one file. The list will now refetch after any approval or rejection.

