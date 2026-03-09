

# Bug: Staff Audit Missing Input Controls (Yes/No Toggles)

## Root Cause

The `StaffStaffAudit.tsx` component checks for `field.field_type === "yes_no"` but the database stores field types as `yesno` and `checkbox`. Since neither matches the `"yes_no"` string, **no input control is rendered** — only the label text appears.

The `LocationAudit.tsx` page works correctly because it handles all three variants:
```typescript
case 'yesno':
case 'yes_no':
case 'checkbox':
```

## The Fix

Update `StaffStaffAudit.tsx` in two places:

### 1. Field rendering (lines 448-511)
Add `yesno` and `checkbox` cases alongside the existing `yes_no` check. The yes/no buttons should render for all three field type values.

### 2. Score calculation (lines 234-239)
The `calculateScore` function also only checks `"yes_no"`. Add `"yesno"` and `"checkbox"` so scores are computed correctly.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/staff/StaffStaffAudit.tsx` | Add `yesno` and `checkbox` to field rendering + score calculation |

One file, two small edits. No backend changes needed.

