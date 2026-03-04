

# Bulk Approve for Evidence Review

## The Problem You've Identified

You're absolutely right. With 71 submitted packets, multiple locations, and dozens of photos daily, reviewing each one individually is unsustainable. Most photo evidence for routine tasks (cleaning, temperature logs, restocking) is straightforward — if the photo shows the work done, it's approved. The current one-by-one flow doesn't scale.

## Proposed Solution: Bulk Approve with Smart Safeguards

### What the user sees

1. **Checkbox column** — Each row in the Evidence Review table gets a checkbox. A "Select all" checkbox in the header selects all visible (filtered) packets.

2. **Floating action bar** — When 1+ packets are selected, a sticky bar appears at the bottom:
   - Shows count: "12 selected"
   - **Bulk Approve** button (green) — approves all selected in one action
   - **Clear selection** link
   - No bulk reject (rejections need individual reasons and trigger task resets/notifications — must stay one-by-one)

3. **Confirmation dialog** — Before bulk approve executes, a dialog confirms: "Approve 12 evidence packets? This cannot be undone." with Approve / Cancel buttons.

4. **Quick filters for faster triage** — Add a "Today" / "Yesterday" / "This week" date filter alongside the existing status filter, so managers can approve today's batch in one sweep.

### Why no Bulk Reject

Rejection has side effects: it resets task completions, sends notifications to specific employees, and requires a reason. These are inherently per-packet actions that need individual attention. Bulk approve is safe because approval has no destructive side effects.

## Technical Approach

### 1. Add selection state to EvidenceReview.tsx

- `useState<Set<string>>` for selected packet IDs
- Checkbox in each row + select-all in header
- Only allow selection when viewing "submitted" status filter

### 2. Create `useBulkApproveEvidence` mutation

- Takes an array of packet IDs
- Loops through each, calling the same update logic as the single-approve flow (UPDATE status + INSERT event)
- Since approval has no complex side effects (unlike rejection), a simple loop is sufficient
- Returns success/failure counts
- Invalidates the same query keys as single approve

### 3. Add floating action bar component

- Renders at the bottom of the page when selection count > 0
- Contains the approve button and count indicator
- Includes confirmation dialog before execution

### 4. Add date quick-filters

- "Today" / "Yesterday" / "This week" / "All" toggle buttons next to the status filter
- Client-side filtering on `created_at` — no extra DB queries needed

### Files to modify
- `src/pages/EvidenceReview.tsx` — selection state, checkboxes, floating bar, date filters
- `src/hooks/useEvidencePackets.ts` — new `useBulkApproveEvidence` mutation

