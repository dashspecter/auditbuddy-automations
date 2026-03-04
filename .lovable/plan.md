
# Staff Audit Scheduling — IMPLEMENTED

## Summary
Staff audit scheduling is now integrated into the same ScheduleAuditDialog. Users can schedule both location and staff audits from one dialog.

## What Was Done

### 1. Database Migration ✅
- Added `employee_id uuid REFERENCES employees(id) ON DELETE SET NULL` to `scheduled_audits` table

### 2. ScheduleAuditDialog.tsx ✅
- Shows all templates (location + staff) with colored type badges
- When a staff template is selected, an employee picker appears (filtered by selected location)
- Staff audits go to `scheduled_audits` table (with employee_id), location audits go to `location_audits` table
- Extracted `AuditEntryCard` sub-component for cleanliness
- Validation: staff templates require employee_id

### 3. useScheduledAuditsNew.ts ✅
- Updated query to include `employees(full_name)` join and `audit_templates(name, template_type)`
- Updated `ScheduledAudit` interface with `employee_id` and `employees` fields
- Updated `useCreateScheduledAudit` to accept `employee_id`

### 4. AuditsCalendar.tsx ✅
- Calendar events from `scheduled_audits` now show `template_type` correctly
- Staff audit events include employee name in title: "Location - Template — Employee"
- `handleStartAudit` and `handleOpenAudit` route staff audits to `/staff-audits/new?scheduled=ID`
- Event details dialog shows "Employee Being Audited" field
- `CalendarEvent.resource` extended with `employeeId` and `employeeName`

### 5. StaffAuditNew.tsx ✅
- Accepts `?scheduled=ID` query parameter
- Fetches scheduled audit record and pre-fills location, employee, template
- Locks pre-filled fields (read-only) in scheduled mode
- After successful submission, updates `scheduled_audits` status to `completed`
- Shows contextual title and description in scheduled mode
