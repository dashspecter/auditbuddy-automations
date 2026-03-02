

# Add Evidence Required Indicator to Task List

## What we'll build

A small camera icon (from lucide-react's `Camera` icon) next to each task title that has an active evidence policy. This gives managers instant visibility into which tasks require proof without opening each one.

## How it works

1. **Batch-fetch evidence policies** — Add a query in the Tasks page that loads all `evidence_policies` where `applies_to = 'task_template'` and `evidence_required = true` for the current company. This returns a set of task IDs that require evidence.

2. **Pass down to TaskListItem** — Pass a `Set<string>` of task IDs with evidence policies as a prop. The component checks if `task.id` is in the set.

3. **Render indicator** — If the task requires evidence, show a `Camera` icon (orange, matching the recurring icon style) next to the title. If manager review is also required, add a small `ShieldCheck` icon beside it.

4. **Also add to TaskItem** (the operational task cards in Today/Tomorrow/Pending tabs) for consistency.

## Visual result

```text
General Inventory / Inventar general 🔄 📷   [High]
  👤 Kitchen Manager  📍 LBFC Amzei  🕐 10:00  ⏱ 60min  🔄 monthly
```

The 📷 camera icon appears inline after the title, similar to how the 🔄 recurring icon already works. Orange color to match the design language.

## Files to change

- **`src/pages/Tasks.tsx`** — Add a query for evidence policies; pass the set to `TaskListItem` and `TaskItem`; render `Camera` / `ShieldCheck` icons inline with the title
- No database changes needed — we're reading existing `evidence_policies` data

