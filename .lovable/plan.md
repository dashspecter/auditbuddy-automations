

# Add Tooltips & Help Text Across the Evidence Flow + Show Rejected Evidence in Compliance Dossier

## Problem Summary

1. The evidence flow (capture → review → approve/reject) has no contextual help — users don't understand what each status means, what happens on rejection, or how it affects scores.
2. Rejected evidence disappears from the Compliance Dossier because the `task_completions` row is deleted on rejection. The dossier only queries `task_completions`, so rejected tasks become invisible.

## Changes

### 1. Evidence Review Page — `src/pages/EvidenceReview.tsx`
- Add a page-level help banner (collapsible) explaining the review workflow:
  - "Submitted" = awaiting manager review
  - "Approved" = proof accepted, task stays completed
  - "Rejected" = proof failed, task reset to pending, employee notified
- Add tooltips on the status filter badges explaining what each status means
- Add tooltip on "Bulk Approve" explaining it only works for submitted items and cannot be undone

### 2. Evidence Packet Viewer — `src/components/evidence/EvidencePacketViewer.tsx`
- Add tooltips on Approve/Reject buttons in the `ReviewPanel`:
  - **Approve**: "Accept this proof. The task completion will be confirmed."
  - **Reject**: "Reject this proof. The task will be reset to pending and the employee will be notified to resubmit."
- Add tooltip on the Redact button: "Permanently hide media for privacy/compliance reasons. Cannot be undone."
- Add a small info line above the review section: "Your decision affects the employee's task record and performance score."

### 3. Evidence Capture Modal — `src/components/evidence/EvidenceCaptureModal.tsx`
- Add a brief help text below the title: "Photos you submit will be reviewed by a manager before the task is marked complete."
- Add tooltip on "Submit Proof" button: "Once submitted, a manager will review your evidence. You'll be notified if it's rejected."

### 4. Evidence Status Badge — `src/components/evidence/EvidenceStatusBadge.tsx`
- Wrap each badge in a Tooltip explaining the status in plain language:
  - **No proof**: "No evidence has been submitted for this item."
  - **Pending review**: "Proof submitted, waiting for a manager to approve or reject."
  - **Proof approved**: "A manager has verified this evidence."
  - **Proof rejected**: "A manager rejected this evidence. The task was reset to pending."

### 5. Compliance Dossier — Show Rejected Evidence — `src/pages/ComplianceDossier.tsx`
- Add a new "Rejected Evidence" section after the Tasks section
- Query `evidence_packets` with `status = 'rejected'` for the selected location and month
- Show: task name, rejection date, reviewer reason, employee who submitted
- Add a help text line: "Rejected evidence means the proof was not accepted. The associated task was reset and may need to be redone."
- Update the PDF export to include this section

### 6. Hardcoded Timezone Fix — `src/hooks/useEvidencePackets.ts`
- Replace the hardcoded `"Europe/Bucharest"` timezone (line ~350) with a lookup from the company's settings or a sensible fallback using the browser's timezone

## Files Changed

| File | Change |
|---|---|
| `src/pages/EvidenceReview.tsx` | Help banner + status filter tooltips + bulk approve tooltip |
| `src/components/evidence/EvidencePacketViewer.tsx` | Tooltips on Approve, Reject, Redact buttons + info line |
| `src/components/evidence/EvidenceCaptureModal.tsx` | Help text for staff submitting proof |
| `src/components/evidence/EvidenceStatusBadge.tsx` | Wrap all badges with explanatory tooltips |
| `src/pages/ComplianceDossier.tsx` | New "Rejected Evidence" section in UI + PDF |
| `src/hooks/useEvidencePackets.ts` | Fix hardcoded timezone |

No database changes needed — all data is already available.

