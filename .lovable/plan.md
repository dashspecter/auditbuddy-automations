

# Staff Audit Scheduling — Same Dialog, Choose Audit Type

Yes, this will happen in the **same** ScheduleAuditDialog. The user picks a location, then picks a template — and the template's `template_type` (location vs staff) determines whether an employee picker appears.

## How It Will Work (User Flow)

1. Open "Schedule Audit" from the calendar
2. Select a **Location** (same as today)
3. For each audit entry, select a **Template** — templates show a badge: "Location" or "Staff"
4. If a **staff template** is selected → an **Employee picker** appears (filtered by that location)
5. Fill in assigned user, start/end time, notes → submit
6. On the calendar, staff audit events show the employee name in the title
7. Clicking "Start Audit" on a staff event → navigates to `/staff-audits/new?scheduled=ID` with pre-filled data

## Technical Changes

### 1. Database: Add `employee_id` to `scheduled_audits`
```sql
ALTER TABLE scheduled_audits 
  ADD COLUMN employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;
```

### 2. `ScheduleAuditDialog.tsx` — Add employee selection
- Templates already come from `useTemplates()` which returns `template_type`
- Show badge next to each template name ("Location" / "Staff")
- When `template_type === 'staff'`, show an employee `<Select>` (using `useEmployees(location_id)`)
- Add `employee_id` to form schema with conditional validation (required only for staff templates)
- On submit: include `employee_id` in the mutation payload

### 3. `useScheduledAuditsNew.ts` — Include employee data
- Add `employee_id` to the query select
- Join `employees(full_name)` for display
- Update the `ScheduledAudit` interface

### 4. `AuditsCalendar.tsx` — Route staff audits correctly
- In `eventsFromScheduledAudits` mapping: detect `template_type` from joined `audit_templates`, include employee name in event title
- In `handleStartAudit`: when `templateType === 'staff'`, navigate to `/staff-audits/new?scheduled=ID` instead of `/location-audit?scheduled=ID`
- Same for `handleOpenAudit`
- Show employee name in event details dialog

### 5. `StaffAuditNew.tsx` — Accept `?scheduled=ID`
- Read `scheduled` query param
- Fetch the `scheduled_audits` record
- Pre-fill and lock: `location_id`, `template_id`, `employee_id`
- After successful submission, update `scheduled_audits` status to `completed`

### Files to modify
| File | Change |
|---|---|
| Database migration | Add `employee_id` column |
| `src/components/ScheduleAuditDialog.tsx` | Template type badges, conditional employee picker, form schema update |
| `src/hooks/useScheduledAuditsNew.ts` | Include `employee_id` + employee join in query |
| `src/pages/AuditsCalendar.tsx` | Staff audit routing + employee name in events |
| `src/pages/StaffAuditNew.tsx` | Accept `?scheduled` param, pre-fill, update status |

