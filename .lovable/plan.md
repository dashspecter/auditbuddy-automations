
# Record Absence — Implementation Complete

## Completed
1. **RecordAbsenceDialog** — reusable component at `src/components/staff/RecordAbsenceDialog.tsx`
2. **useAbsences hook** — shared logic at `src/hooks/useAbsences.ts` (queries workforce_exceptions, provides `isAbsent`, `isDayPastOrToday`, `refreshAbsences`)
3. **ManagerSchedule** (Who's Working) — tap assigned employee card → record absence
4. **EnhancedShiftWeekView** (Desktop Week View) — AlertTriangle button on employee/location shift cards for past/today
5. **MobileShiftDayView** (Mobile View) — AlertTriangle button on shift cards for past/today
6. **Shifts.tsx Day View** (Desktop Day View) — tappable employee badges for past/today
