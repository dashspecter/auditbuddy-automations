

## Fix: Database Trigger Overriding Manager's Shift Assignments

### Problem
When a manager assigns an employee to a shift, the application code correctly sets `approval_status = 'approved'`. However, a **database trigger** (`trigger_auto_approve_shift_assignment`) runs AFTER the insert and **overrides** the status back to `pending` if the employee's role doesn't match the shift's role.

In this case:
- Alex Grecea's role = "Executive Manager"  
- Shift role = "Auditor"  
- Trigger sees role mismatch and forces `approval_status = 'pending'`

This defeats the purpose of a manager explicitly assigning staff.

### Root Cause
The trigger `auto_approve_shift_assignment` was designed for a self-service scenario (e.g., staff picking up shifts from a pool) where role matching determines auto-approval. But it also fires on **manager-initiated assignments**, overriding the already-set `approved` status.

### Solution
Update the trigger to **respect** the approval status when it's already set to `approved` by the application (i.e., when a manager assigns directly). Only apply role-matching logic when the status is not already `approved`.

### Changes

**1. Database migration** -- Update the trigger function:

The trigger will be modified to skip its logic if `NEW.approval_status` is already `'approved'` and `NEW.approved_at` is already set. This means:
- Manager assigns staff directly: status stays `approved` (no override)
- Staff self-assigns from pool: trigger checks role match and sets `approved` or `pending` accordingly

**2. Fix existing data** -- Update the two stuck assignments:

The migration will also update Alex Grecea's two existing `pending` assignments (for Feb 21 and Feb 22) to `approved`, since these were manager-assigned.

### No UI Changes Needed
Once the trigger is fixed, the existing UI code will work correctly:
- Shifts with approved assignments will show the employee name normally in the schedule grid
- The "Pending" badge will only appear for genuinely pending assignments (e.g., self-service pool pickups)
- No changes needed to `EnhancedShiftWeekView.tsx` -- it already handles both statuses properly

