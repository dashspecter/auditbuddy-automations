

## Auto-Create Shift on Unscheduled Clock-In Approval

### Current Problem

When a manager approves an "Unscheduled Clock-In" exception, only the exception status changes to "approved." No shift or assignment is created. The attendance record stays with `shift_id = null`, meaning:
- The employee doesn't appear on the schedule for that day
- Payroll has no shift to reference for hours worked
- There's no audit trail of what shift was retroactively approved

### Proposed Flow

```text
Employee clocks in (no shift)
  -> Attendance log created (shift_id = null)
  -> Exception created (type: unscheduled_shift, status: pending)

Manager clicks "Approve" on the exception
  -> Create a new shift for that location + date (start = clock-in time, end = TBD or shift template)
  -> Create a shift_assignment (employee -> shift, approval_status = 'approved')
  -> Link the attendance record to the new shift (update shift_id)
  -> Mark exception as 'approved'
```

### What the Manager Sees

When approving an unscheduled clock-in exception, the system will:
1. Auto-create a shift starting at the employee's clock-in time, with the employee's role
2. Set a default end time (e.g., clock-in + 8 hours, or based on the location's typical shift length)
3. Create an approved assignment linking the employee to this shift
4. Update the attendance record to reference the new shift

The manager can later edit the shift times on the schedule grid if needed (e.g., adjust the end time once the employee checks out).

### Changes

| File | What Changes |
|------|-------------|
| `src/hooks/useScheduleGovernance.ts` | Enhance `useResolveWorkforceException` -- when approving an `unscheduled_shift` exception, also create a shift, assignment, and link the attendance record |
| `src/components/workforce/WorkforceExceptionsPanel.tsx` | Show the clock-in time in the exception card so managers know when the employee arrived |

### Technical Details

**useResolveWorkforceException mutation update:**

When `status === 'approved'` and the exception is `unscheduled_shift`:

1. Fetch the exception details (including `attendance_id`, `employee_id`, `location_id`, `shift_date`, `metadata.clock_in_time`)
2. Fetch the employee's role from the `employees` table
3. Create a shift:
   ```
   insert into shifts {
     company_id, location_id, shift_date,
     start_time: extracted from clock_in_time (local),
     end_time: start_time + 8 hours (default, editable later),
     role: employee's role,
     is_published: true,
     status: 'published',
     created_by: manager's user_id
   }
   ```
4. Create a shift assignment:
   ```
   insert into shift_assignments {
     shift_id: new shift,
     staff_id: employee_id,
     assigned_by: manager's user_id,
     approval_status: 'approved',
     approved_at: now
   }
   ```
5. Update the attendance log:
   ```
   update attendance_logs set shift_id = new_shift_id
   where id = exception.attendance_id
   ```

**WorkforceExceptionsPanel enhancement:**

Display the clock-in time from the exception metadata so the manager can see exactly when the employee arrived before approving:
```
Clock-in: 12:13 PM
```

### Edge Cases

- If the employee has already checked out by the time the manager approves, use the actual check-out time as the shift end time instead of the default +8 hours
- The created shift uses the employee's current role -- the manager can change it later on the schedule grid
- The shift is created as "published" since it's a retroactive approval of work already done

### Result

- Approving an unscheduled clock-in will add the employee to the schedule automatically
- The attendance record gets linked to a proper shift for payroll
- The manager retains full control -- they can edit shift times or role afterward
- No tasks are assigned (as requested -- the manager handles task allocation separately)
