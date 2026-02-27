

# Show Department Name in Registered Kiosks List

## Problem
The kiosk is created with `department_id` correctly, but the registered kiosks list doesn't fetch or display department info.

## Changes

### 1. `src/hooks/useAttendanceKiosks.ts`
- Update the `useAttendanceKiosks` query select from `*, locations:location_id(name)` to also join departments: `*, locations:location_id(name), departments:department_id(name)`
- Add `departments?: { name: string } | null` to the `AttendanceKiosk` interface

### 2. `src/components/workforce/KioskManagementDialog.tsx`
- In the kiosk card, below the location line, add a department line showing a `Building2` icon + department name when present (e.g. "Back of House")
- Only render when `kiosk.departments?.name` exists

Two small edits, no database changes needed.

