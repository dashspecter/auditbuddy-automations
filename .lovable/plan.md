

# Fix: Dash Command Center Text Overflow — Final Root Cause Analysis

## Why previous fixes didn't work

The CSS applied to the markdown prose container (line 122) is correct. The problem is that **the overflow is not coming from markdown text** — it's coming from three other sources that were never addressed:

### Root Cause 1: DataTableCard uses `whitespace-nowrap` with no horizontal scroll
`DataTableCard.tsx` lines 25 and 35 use `whitespace-nowrap` on all table header and body cells. The `ScrollArea` wrapping the table only constrains height (`max-h-[300px]`), not width. A table with many columns or long cell values pushes the entire bubble wider than the container.

### Root Cause 2: Structured event cards sit outside the overflow-protected zone
In `DashMessageList.tsx`, the markdown content at line 122 has `overflow-hidden` and word-break styles. But the structured event cards (lines 127-132 — tables, action previews, execution results, clarifications) render **outside** that protected zone, in a bare fragment (`<>...</>`) with no overflow constraint.

### Root Cause 3: Radix ScrollArea Viewport doesn't constrain width
The `ScrollArea` component's Viewport (`scroll-area.tsx` line 11) has `w-full` but no `min-w-0`. In a flex layout, this means the viewport can grow beyond its parent instead of constraining its children. This is a known Radix ScrollArea issue in flex containers.

## Implementation

### 1. Fix DataTableCard — add horizontal scroll
- Replace the `ScrollArea` with a proper `div` that has both `overflow-x-auto` and `max-h-[300px] overflow-y-auto`
- Or keep ScrollArea but wrap the Table in a `div` with `overflow-x-auto` and `w-full`
- This lets wide tables scroll horizontally inside the card instead of pushing the bubble

### 2. Wrap structured events in an overflow-safe container
- In `DashMessageList.tsx`, wrap the post-text structured events (lines 127-132) in a `div` with `overflow-hidden min-w-0 w-full`
- Same for the pre-text source cards (lines 114-118)

### 3. Fix ScrollArea Viewport for flex contexts
- In `scroll-area.tsx`, add `min-w-0` to the Viewport className so it respects flex parent constraints
- This is the upstream fix that prevents the entire chat scroll area from expanding

### 4. Add overflow-hidden to all card components
- `ActionPreviewCard.tsx` root div (line 47): add `overflow-hidden`
- `ExecutionResultCard.tsx` root div (line 23): add `overflow-hidden`
- `ClarificationCard.tsx` root div (line 12): add `overflow-hidden`
- Each card should be a self-contained box that never escapes its parent

## Files to change

| File | Change |
|------|--------|
| `src/components/dash/DataTableCard.tsx` | Add `overflow-x-auto` wrapper around the table |
| `src/components/dash/DashMessageList.tsx` | Wrap structured event sections in overflow-safe container |
| `src/components/ui/scroll-area.tsx` | Add `min-w-0` to Viewport for flex compatibility |
| `src/components/dash/ActionPreviewCard.tsx` | Add `overflow-hidden` to root |
| `src/components/dash/ExecutionResultCard.tsx` | Add `overflow-hidden` to root |
| `src/components/dash/ClarificationCard.tsx` | Add `overflow-hidden` to root |

## Why this is the final fix

Previous attempts targeted the markdown prose container, which was already correct. The actual overflow sources are:
1. A table component that explicitly prevents wrapping with no horizontal scroll
2. Structured cards rendered outside any overflow boundary
3. A ScrollArea viewport that doesn't respect flex constraints

These are three distinct, verifiable bugs with clear mechanical fixes. No amount of `break-words` on the prose container will fix a `whitespace-nowrap` table or an unconstrained flex child.

