

# Fix: `useIsMobile()` Race Condition

## What's wrong

The `useIsMobile()` hook starts as `undefined`, so on the first render the redirect logic sees `false` and sends owner/admin users to `/dashboard` before the mobile check fires.

## Fix — one file, one line

### `src/hooks/use-mobile.tsx`

Change the initial state from `undefined` to a synchronous `window.innerWidth` check:

```typescript
const [isMobile, setIsMobile] = React.useState<boolean>(
  typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
);
```

Return `isMobile` directly (no `!!` coercion needed).

## Impact

- **Owner/admin on mobile**: will now correctly land on `/command` on first render
- **All other roles**: completely unaffected — staff still goes to `/staff`, members/managers still go to `/dashboard`
- **Desktop users**: unaffected — `isMobile` will be `false` from the start, same as before
- **Every other consumer of `useIsMobile()`**: benefits from the fix (gets correct value on first render instead of `undefined → false`)

No other files need changes.

