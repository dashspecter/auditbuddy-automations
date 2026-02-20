

## Completion Flow for "Action Required" Items

Currently, when a staff member finishes a corrective action item, they either click "Mark Done" (a simple checkbox-style action) or, if evidence is required, they must attach a photo. The message "Contact your manager" is the only follow-up. This feels too light for serious issues.

### Proposed Solution: "Resolution Report" Mini-Form

When the staff member taps "Mark Done" on the mobile Action Required card, instead of immediately marking it done, a **Resolution Report modal** opens requiring them to:

1. **Completion Notes (required)** -- A text area where they describe what they did to fix the issue (minimum ~10 characters to prevent empty entries like "ok").
2. **Photo Evidence (optional)** -- A button to optionally attach a proof photo using the existing EvidenceCaptureModal infrastructure. The photo is clearly marked as optional but encouraged.
3. **Confirmation Checkbox** -- "I confirm this issue has been properly resolved" -- must be checked before submitting.

This creates a meaningful "weight" to the completion without being burdensome. The manager then sees the notes and optional photo when reviewing/verifying.

### What Changes

**Database:**
- Add a `completion_notes` TEXT column to `corrective_action_items` (nullable, no breaking change).

**New Component:**
- `src/components/correctiveActions/ResolutionReportModal.tsx` -- A dialog with:
  - Text area for completion notes (required, min length validation)
  - Optional photo capture button (reuses EvidenceCaptureModal)
  - Confirmation checkbox
  - Submit button

**Modified Files:**

1. `src/hooks/useCorrectiveActions.ts`
   - Update `CompleteItemArgs` to include `completionNotes: string`
   - Save `completion_notes` in the update query
   - Log notes in the event payload

2. `src/components/staff/MyCorrectiveActionsCard.tsx`
   - Replace "Contact your manager" text with a "Resolve" button per item
   - Tapping "Resolve" opens the ResolutionReportModal
   - On submit, calls `useCompleteActionItem` with notes and optional evidence
   - Replace the static footer text with "Your manager will be notified for verification"

3. `src/components/correctiveActions/ActionItemCard.tsx` (manager detail view)
   - Display `completion_notes` when the item is done/verified so the manager can read what the staff member reported
   - Show evidence badge if photo was optionally attached

4. `src/pages/correctiveActions/CorrectiveActionDetail.tsx`
   - Wire up the EvidenceCaptureModal properly for CA items (currently it's a placeholder toast)

### User Experience Flow

```text
Staff sees "Action Required" card
  -> Taps "Resolve"
  -> Resolution Report modal opens:
     [What did you do to fix this?]
     ___________________________
     |                           |
     |  (text area, required)    |
     |___________________________|

     [+ Add Photo Proof] (optional)

     [ ] I confirm this issue has been
         properly resolved

     [Cancel]  [Submit Resolution]
  -> Item moves to "done" status
  -> Manager sees notes + photo in verification view
```

### Technical Details

- The `completion_notes` column is added via migration with no default constraint
- The existing `evidence_packet_id` column on `corrective_action_items` is reused for the optional photo
- The `EvidenceCaptureModal` component is reused as-is for the optional photo flow
- No changes to edge functions or RLS policies needed (the column follows existing row-level access)
- The event log payload will include `completion_notes` for the audit trail

