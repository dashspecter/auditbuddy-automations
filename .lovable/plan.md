

## Move WhatsApp Tooltip to Visible Helper Text

### What
Replace the hover-only `InfoTooltip` icon with a static helper text line below the existing "Send assignment, reminder & overdue alerts" description, making the guidance always visible.

### Change

**File: `src/pages/TaskNew.tsx`** (single file change)

Remove the `InfoTooltip` component from the label and add a new paragraph below the existing description:

```tsx
// Revert label back to simple:
<Label className="font-medium">Notify via WhatsApp</Label>
<p className="text-xs text-muted-foreground mt-0.5">
  Send assignment, reminder &amp; overdue alerts to assigned employees
</p>
<p className="text-xs text-amber-600 mt-1">
  Tip: Use selectively for critical tasks (start/mid/end of shift) to avoid notification fatigue and daily message limits.
</p>
```

- Remove the `InfoTooltip` import since it will no longer be used
- The tip text appears in amber/warning color to stand out without being alarming
- Always visible -- no hover or tap needed

