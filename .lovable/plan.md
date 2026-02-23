

## Improve Shift Count Indicator for Scheduling

### Current State

The schedule already shows small badges next to employee names when they have "Expected Shifts/Week" set — an orange `-2` if they're missing shifts, or a green `+1` if they have extras. However, this is easy to miss and doesn't show the full picture (e.g., "how many do they have vs. how many do they need?").

### What Changes

Upgrade the indicator to show a clear **ratio badge** like `3/5` (current/expected) next to the employee name, color-coded:

- **Orange** when below expected (e.g., `3/5`) -- still need more shifts
- **Green** when at or above expected (e.g., `5/5` or `6/5`)
- **Hidden** when no expected shifts are configured for the employee

Also add a **tooltip on hover** that says something like: "3 of 5 expected shifts scheduled — 2 more needed"

### Visual Example

```text
Employee column (current):
  [AA] Ala Aldghrati        -2
       Chef

Employee column (new):
  [AA] Ala Aldghrati      [3/5]
       Chef
```

The `[3/5]` badge is orange. Hovering shows: "3 of 5 expected shifts scheduled this week. 2 more shifts needed."

When full: `[5/5]` in green. Hovering shows: "All expected shifts scheduled."

### Technical Details

**File**: `src/components/workforce/EnhancedShiftWeekView.tsx`

1. **Update `getShiftIndicator`** (line 318-331) to return the actual count and expected count, not just the diff:
   ```
   return { actual, expected, diff }
   ```

2. **Update the rendering** (lines 952-963) to show a ratio badge (`actual/expected`) instead of `+N` / `-N`, wrapped in a `Tooltip` (already imported in the file).

3. Color logic:
   - `actual < expected` → orange background
   - `actual >= expected` → green background

One file changed, roughly 20 lines modified. No database or backend changes needed. No risk to existing functionality.

