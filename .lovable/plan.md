

# Add Tooltips to Evidence Policy Toggles

## What
Add `InfoTooltip` icons next to both "Require proof photo" and "Also require review" labels, explaining the workflow and value to managers.

## Files to change
- **`src/pages/TaskNew.tsx`** (lines 672, 681) -- add InfoTooltip next to each label
- **`src/pages/TaskEdit.tsx`** (lines 731, 740) -- same changes
- **`src/pages/audits/TemplateBuilder.tsx`** (lines 299, 309) -- same for audit templates
- **`src/pages/TemplateEditor.tsx`** (lines 344) -- same for template editor

## Tooltip content

**Require proof photo:**
> "When enabled, staff cannot mark this task as complete without first taking a photo. This ensures accountability and creates a visual record. Use it for cleaning tasks, safety checks, or any task where visual confirmation matters."

**Also require review:**
> "When enabled, a manager must approve the submitted photo before the task counts as fully completed. If rejected, the task resets to pending and the employee is notified. Great for high-stakes tasks like food safety or compliance checks."

## Implementation
Import `InfoTooltip` from `@/components/correctiveActions/InfoTooltip` in each file, then place it inline next to each `<Label>`:

```tsx
<Label className="font-medium">
  Require proof photo <InfoTooltip content="When enabled, staff cannot mark this task as complete without first taking a photo. This ensures accountability and creates a visual record. Use it for cleaning tasks, safety checks, or any task where visual confirmation matters." />
</Label>
```

Same pattern for "Also require review" with its respective tooltip text. Four files, same change in each.

