

## Add "Extra" Badge to Location View Shift Cards

### Problem
The "Extra" badge (orange label) only appears on shift cards in the **Employee view**. The **Location view** has a separate rendering block that's missing this badge, so when you switch to Locations (the new default), Bibek's extra shifts on March 4 and 5 don't show the indicator -- even though the data is correct in the database.

### Fix

**File: `src/components/workforce/EnhancedShiftWeekView.tsx`**

Add the "Extra" badge to the location view shift card, right after the existing "Draft" badge (around line 1211). This is the same orange badge already used in the employee view:

```tsx
{shift.shift_type === 'extra' && (
  <Badge className="text-[10px] px-1 py-0 bg-orange-500 text-white border-transparent hover:bg-orange-600">
    Extra
  </Badge>
)}
```

### Result
Shift cards in both Employee and Location views will display the orange "Extra" badge when the shift is tagged as extra.
