

# Fix: Sidebar Tooltips Rendering Behind Page Content

## Root Cause

The `TooltipContent` component in `src/components/ui/tooltip.tsx` does **not** wrap the content in Radix's `TooltipPrimitive.Portal`. Without the Portal wrapper, the tooltip renders **inline in the DOM tree** — inside the sidebar's `<aside>` element.

The sidebar's `<aside>` has no explicit `z-index`, and the navigation container at line 715 of `AppSidebar.tsx` has `overflow-y-auto`. This means:

1. The tooltip renders as a child of the sidebar DOM
2. The sidebar sits at the same stacking level as the main content area
3. The main content's cards overlap the tooltip because they come later in the DOM flow
4. Even though `TooltipContent` has `z-50`, z-index only works within the same stacking context — and the sidebar creates its own

## Fix

**File:** `src/components/ui/tooltip.tsx`

Wrap `TooltipPrimitive.Content` in `TooltipPrimitive.Portal` so tooltips render at `document.body` level, escaping all parent overflow and stacking contexts:

```typescript
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
```

This is a one-line wrapper addition. It fixes **all** tooltips across the entire app — sidebar nav, collapsed sidebar icon tooltips, and any other tooltip usage.

## Files Modified

| File | Change |
|------|--------|
| `src/components/ui/tooltip.tsx` | Wrap `TooltipPrimitive.Content` in `TooltipPrimitive.Portal` |

