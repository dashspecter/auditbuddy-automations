

# Corrective Action Staff Flow — Already Implemented

## Current Flow (already working)

```text
Manager creates CA ──→ Action items assigned to staff (by user_id or role)
                                    │
                                    ▼
              Staff Mobile Home (/staff)
              ┌─────────────────────────────────────┐
              │  🔴 Action Required (red card)       │
              │  Shows all open CA items assigned    │
              │  to this employee                    │
              │                                      │
              │  [Resolve] button → opens modal      │
              │  [Retake Test] → for test failures   │
              └─────────────────────────────────────┘
                                    │
                                    ▼
              ResolutionReportModal opens
              (staff writes notes + attaches evidence if required)
                                    │
                                    ▼
              Item status → "done"
              Manager sees "Verify" / "Reject" buttons
                                    │
                                    ▼
              All items verified → CA can be "Closed"
```

## Where Staff See It

On **Staff Home** (`/staff`), the `MyCorrectiveActionsCard` component renders automatically when the logged-in employee has open CA items. It:

- Queries `corrective_action_items` where `assignee_user_id = current user` and status is `open` or `in_progress`
- Shows a red "Action Required" card with item count
- Each item shows: parent CA title, severity, instructions, due date (with overdue warning)
- **"Resolve" button** opens the `ResolutionReportModal` where staff can write resolution notes and attach evidence
- **"Retake Test" button** appears for test-failure CAs, navigating directly to the test

## The Real Issue You Hit

The problem wasn't the staff side — it's the **manager side** on the CA detail page. When the manager clicks "Mark Done" on behalf of staff (for items with `evidence_required`), it shows a placeholder toast instead of opening the evidence capture modal. That's the fix we identified in the previous conversation.

## No Changes Needed

The staff mobile flow is complete. The only gap is the manager-side evidence capture on the CA detail page, which was already identified and planned in the previous message.

