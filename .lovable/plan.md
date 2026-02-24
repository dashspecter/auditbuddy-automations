

## Add Tooltip to WhatsApp Toggle on Task Creation

### What
Add an informational tooltip next to the "Notify via WhatsApp" label on the task creation page. The tooltip will advise managers to use WhatsApp notifications selectively -- ideally for critical tasks like start-of-shift, mid-shift check-ins, and end-of-shift tasks -- rather than enabling it for every task.

### Why
- Prevents notification fatigue for employees
- Reduces WhatsApp messaging costs (paid module)
- Respects daily message limits and quiet hours
- Encourages thoughtful use of the channel

### Changes

**File: `src/pages/TaskNew.tsx`** (single file change)

Add the existing `InfoTooltip` component (already used in corrective actions) next to the "Notify via WhatsApp" label:

```tsx
import { InfoTooltip } from "@/components/correctiveActions/InfoTooltip";

// Around line 718, change:
<Label className="font-medium">Notify via WhatsApp</Label>

// To:
<Label className="font-medium flex items-center gap-1.5">
  Notify via WhatsApp
  <InfoTooltip
    content="Use WhatsApp notifications selectively for critical tasks — such as start-of-shift prep, mid-shift check-ins, or end-of-shift wrap-ups. Enabling it for every task can cause notification fatigue and may hit daily message limits."
  />
</Label>
```

### Technical Details
- Reuses the existing `InfoTooltip` component from `src/components/correctiveActions/InfoTooltip.tsx`
- No new dependencies or components needed
- No database or backend changes
- Tooltip appears on hover/tap with a small info icon next to the label

