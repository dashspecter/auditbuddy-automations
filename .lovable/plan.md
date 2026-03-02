

# Record Absence from "Who's Working" Page

## What We're Building

A "Record Absence" flow on the ManagerSchedule page. When a manager taps an assigned employee's shift card, a dialog opens allowing them to mark that employee as absent with a reason. The absence is stored as a `workforce_exception` (existing table -- no schema changes needed) with `exception_type = 'absence'`.

## No Schema Changes Required

The `workforce_exceptions` table already has all needed columns: `employee_id`, `shift_id`, `shift_date`, `location_id`, `company_id`, `exception_type`, `reason_code`, `note`, `status`, `requested_by`, `metadata`. We use the existing `create_workforce_exception` database function.

## Reason Codes (Extended Set)

`sick`, `no_show`, `family_emergency`, `excused`, `unplanned_vacation`, `personal`, `suspended`, `other`

## Implementation (2 files, 1 new component)

### File 1: New `src/components/staff/RecordAbsenceDialog.tsx`

A dialog component containing:
- Employee name + shift date displayed at the top
- Radio group or select for reason code (the 8 options above)
- Optional text note field
- Submit button that calls `create_workforce_exception` with `exception_type: 'absence'`
- Success toast + data reload on submit

### File 2: Modify `src/pages/staff/ManagerSchedule.tsx`

- Add state for selected assignment (`selectedAbsence: { shiftId, employeeId, employeeName, shiftDate, locationId } | null`)
- Make each assigned employee row tappable (onClick on the assignment div)
- Only show the action for past/today shifts (not future)
- Render `<RecordAbsenceDialog>` at the bottom, controlled by `selectedAbsence` state
- After successful recording, reload shifts data
- Also query existing `workforce_exceptions` for the current week to show a small "Absent" badge on shifts that already have a recorded absence

## What We Don't Touch

- Payroll logic (`usePayroll.ts`) -- absences recorded here are informational for now; payroll already handles missed shifts via attendance logs
- Auth flow, navigation, bottom nav, routes -- zero changes
- Database schema -- reusing existing table and function

## Payroll Visibility (Future)

The payroll summary's "Missed" section could later show the absence reason by joining `workforce_exceptions`, but that's out of scope for this task to keep risk minimal.

