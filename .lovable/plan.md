

# Add Help Tooltips to Exception Action Buttons

## What

Add tooltips to the three action buttons (Approve, Resolve, Deny) in the **Exceptions** tab of the `PendingApprovalsDialog` so managers understand what each action does before clicking.

## Tooltip Content

| Button | Tooltip |
|---|---|
| **Approve** | "Excuse this exception — it won't count against the employee's score or record." |
| **Resolve** | "Acknowledge this exception without excusing it. Clears it from the queue but keeps it on record." |
| **Deny** | "Mark this exception as a violation. It will count against the employee's record." |

## Changes

| File | Change |
|---|---|
| `src/components/workforce/PendingApprovalsDialog.tsx` | Wrap each of the 3 exception buttons (lines 299–309) with `TooltipProvider > Tooltip > TooltipTrigger/TooltipContent` using the existing tooltip components already imported elsewhere in the project. Also add a small help text line above the buttons: "How should this exception be handled?" |

Uses the existing `@/components/ui/tooltip` components — no new dependencies.

