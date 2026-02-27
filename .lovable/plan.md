

# Editable Vacation Days + Mobile Tooltip

## What changes

### 1. Add `annual_vacation_days` field to EmployeeDialog (`src/components/EmployeeDialog.tsx`)
- Add `annual_vacation_days` to formData state (default `"21"`)
- Initialize from `employee.annual_vacation_days` when editing
- Add a number input field in the employment/contract section labeled "Annual Vacation Days"
- Include it in `submitData` as `parseInt` or `null`
- This field already exists on the `employees` table — no migration needed

### 2. Fix VacationDetailsDialog to use actual employee data (`src/components/staff/VacationDetailsDialog.tsx`)
- Query `annual_vacation_days` from the employee record instead of hardcoding `25`
- Use `employee.annual_vacation_days || 21` as the total

### 3. Fix StaffTimeOff mobile view (`src/pages/staff/StaffTimeOff.tsx`)
- Already reads `annual_vacation_days` from DB — this part is correct
- Add a tooltip/info banner below the vacation balance card with the text: "Always verify with HR — updates can take up to 10 days"
- Use `Info` icon + muted styling for the disclaimer

### 4. No database changes needed
- `annual_vacation_days` column already exists on `employees` table
- RLS policies already allow admin/owner/manager updates via `useUpdateEmployee`

