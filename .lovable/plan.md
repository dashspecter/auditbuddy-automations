

## Fix: Show Pending Staff in Draft Shifts Instead of "No staff assigned"

### Problem
The Auditor shifts (Feb 20-22) **do** have Alex Grecea assigned, but with `approval_status: pending`. The schedule grid treats shifts with only pending assignments as "unassigned drafts" and displays a hardcoded "No staff assigned" message, which is misleading.

### Solution
Update the draft/unassigned shifts row in `EnhancedShiftWeekView.tsx` to display pending assignee names instead of the generic "No staff assigned" text.

---

### Changes

**File: `src/components/workforce/EnhancedShiftWeekView.tsx`**

1. **Update the draft shift card rendering (lines ~894-897)** to check for pending assignments and display the assignee names with a "Pending" indicator, instead of always showing "No staff assigned":
   - If the shift has pending assignments, show each assignee name with an amber "Pending approval" badge
   - Only show "No staff assigned" if there are truly zero assignments (no pending, no approved)

2. **Keep the filter logic unchanged** (line 290-296) — shifts with only pending assignments should still appear in the draft row since they aren't confirmed yet, but with better labeling.

### Technical Details

In the draft shifts `.map()` block (around line 870), replace the hardcoded "No staff assigned" with:

```text
- Check shift.shift_assignments for any pending entries
- If pending assignments exist:
    Show: "[Employee Name] - Pending approval" (amber text)
- If no assignments at all:
    Show: "No staff assigned" (orange text, current behavior)
```

This requires resolving employee names from the `employees` array already available in the component.

### Scope
- Single file change: `EnhancedShiftWeekView.tsx`
- No database or backend changes needed
- The pending approval workflow remains unchanged -- managers still approve via the Approvals dialog
