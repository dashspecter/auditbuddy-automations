

# Filter Kiosk Dashboard by Department

## The Problem
A kiosk is currently scoped to a **location** only. In a restaurant with Front of House (FOH) and Back of House (BOH) departments, a kiosk in the kitchen shows FOH staff and tasks too — irrelevant and noisy.

## The Solution
Add an optional `department_id` to the `attendance_kiosks` table. When set, the kiosk filters everything (employees, tasks, attendance, champions, scores) to only show staff whose role belongs to that department.

This is low-risk because the column is nullable — existing kiosks continue showing all staff (no breaking change).

## Existing Infrastructure
- **Departments** table already exists with company-scoped departments
- **Employee roles** already have a `department_id` foreign key
- **Employees** have a `role` text field that matches `employee_roles.name`
- The kiosk dashboard already filters by `location_id` — we add one more filter layer

## Database Changes

### Migration: Add `department_id` to `attendance_kiosks`
```sql
ALTER TABLE public.attendance_kiosks
  ADD COLUMN department_id uuid REFERENCES public.departments(id);
```

## Code Changes

### 1. `src/hooks/useAttendanceKiosks.ts`
- Add `department_id` to the `AttendanceKiosk` interface
- Update `useCreateKiosk` to accept optional `departmentId`
- Update `useKioskByToken` select to include `department_id`

### 2. Kiosk registration UI (wherever kiosks are created)
- Add an optional department selector when registering a kiosk
- Label: "Filter by department (optional)" — if left blank, shows all staff

### 3. `src/components/kiosk/KioskDashboard.tsx`
- Accept new prop `departmentId?: string | null`
- When `departmentId` is set:
  - Fetch role names belonging to that department (`employee_roles` where `department_id` matches)
  - Filter `employees` query to only those whose `role` matches a role in that department
  - Tasks, attendance, champions, and MTD scores all cascade from this filtered employee list — no other query changes needed

### 4. `src/pages/AttendanceKiosk.tsx`
- Pass `kiosk.department_id` to `KioskDashboard` as `departmentId` prop
- Optionally show department name in the header alongside location name

## Flow Summary
```text
Kiosk registered with department_id = "BOH"
  → KioskDashboard receives departmentId
  → Fetch employee_roles where department_id = "BOH" → get role names ["Chef", "Kitchen Porter"]
  → Filter employees to those with matching roles
  → All downstream (team, tasks, champions, scores) uses this filtered employee list
  → FOH staff never appears on BOH kiosk
```

