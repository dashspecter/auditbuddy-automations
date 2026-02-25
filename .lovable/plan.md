

## Problem Analysis

Two issues identified:

### Issue 1: Evidence Review page always shows "0" for all status badges
The status summary badges (submitted: 0, approved: 0, rejected: 0) are computed from `packets` — which is the **already-filtered** result. When the filter is set to "submitted" (default), only submitted packets are fetched from the database. The count logic then loops over those filtered results, so approved/rejected counts are always 0.

**Root cause** in `EvidenceReview.tsx` (line 82-85):
```typescript
const statusCounts = packets.reduce(...)  // ← "packets" is already filtered by statusFilter
```

And the query itself applies the filter at the database level (line 49):
```typescript
if (statusFilter && statusFilter !== "all") {
  q = q.eq("status", statusFilter);
}
```

### Issue 2: No visibility of approved evidence outside Evidence Review
After a manager approves evidence, the "approved" status is only visible:
- On the Evidence Review page (if you filter to "approved")
- Inline on the specific task/audit/work order detail page via the `EvidenceStatusBadge`

There is no notification, dashboard summary, or completion indicator that calls attention to approved evidence.

---

## Fix Plan

### Fix 1: Separate the summary counts from the filtered list

**File: `src/pages/EvidenceReview.tsx`**

Add a second query that always fetches **all** packets (no status filter) just for computing badge counts. The existing filtered query continues to drive the table display.

1. Create `useEvidencePacketCounts(companyId)` — a lightweight query that fetches `status` column only with no status filter, grouped or reduced client-side for counts
2. Use those counts for the badge chips at the top
3. Keep the existing `useAllEvidencePackets` query with `statusFilter` for the table rows

Alternatively (simpler): change the existing hook to always fetch **all** packets, then filter client-side for the table. Since it's capped at 200 rows, this is fine:
- Remove the database-level status filter from the query
- Apply status filtering client-side alongside the text search
- Compute `statusCounts` from the unfiltered `packets` array

This is the simpler approach — one query, no status filter at DB level, client-side filtering for both status and search.

### Fix 2 (optional, not in this scope): Surface approved evidence better
This is a UX enhancement for later — e.g., showing a green checkmark on completed tasks in manager dashboards, or sending a notification when evidence is approved. Not blocking.

---

## Technical Details

**File: `src/pages/EvidenceReview.tsx`**

1. **Remove DB-level status filter** from `useAllEvidencePackets` — always fetch all packets (up to 200):
   - Remove the `statusFilter` parameter from the hook
   - Remove the `if (statusFilter !== "all") q = q.eq("status", statusFilter)` line

2. **Compute `statusCounts` from all packets** (before any filtering):
   ```typescript
   const statusCounts = packets.reduce(...)  // from full unfiltered array
   ```

3. **Apply status + text filtering client-side** for the table:
   ```typescript
   const filtered = packets.filter((p) => {
     if (statusFilter !== "all" && p.status !== statusFilter) return false;
     if (!search.trim()) return true;
     // ...existing text search logic
   });
   ```

This ensures badges always show accurate totals and the table respects the selected filter.

