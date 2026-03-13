
Goal: do one comprehensive terminology sweep so Government Institution tenants stop seeing hospitality/default terms in remaining screens.

What I found in code (remaining high-impact gaps):
1) Staff app + manager mobile surfaces still hardcoded:
- src/components/staff/StaffBottomNav.tsx
- src/components/staff/ManagerAuditsCard.tsx
- src/components/staff/ManagerAuditStats.tsx
- src/components/staff/ManagerDashboardStats.tsx
- src/components/staff/ManagerApprovalsSection.tsx
- src/components/staff/CheckerAuditsCard.tsx
- src/components/staff/OfferedShiftsCard.tsx
- src/components/staff/StaffGreeting.tsx
- src/components/staff/WelcomeClockInDialog.tsx
- src/components/staff/StaffNav.tsx (legacy but still hardcoded)

2) Staff pages with many static labels/fallbacks:
- src/pages/staff/StaffSchedule.tsx
- src/pages/staff/StaffShifts.tsx
- src/pages/staff/StaffShiftPool.tsx
- src/pages/staff/StaffTimeOff.tsx
(and related wording in StaffHome flow)

3) Workforce performance/profile/admin surfaces still using Employee/Location/Shift literals:
- src/pages/workforce/BadgeSettings.tsx
- src/pages/workforce/EmployeePerformance.tsx
- src/pages/workforce/StaffProfile.tsx
- src/components/employee-dossier/WarningsSection.tsx

4) Reporting/admin summary screens still static:
- src/pages/Reports.tsx
- src/pages/ActivityLog.tsx
- src/pages/admin/company-detail/CompanyActivityOverview.tsx
- src/components/dashboard/OpenCorrectiveActionsWidget.tsx
- src/components/dashboard/ExecutiveDashboard.tsx (header text is still fixed)

Implementation plan:
Phase 1 — Standardize terminology usage pattern
- Apply useTerminology in all above files.
- Replace hardcoded nouns with term functions:
  - employee()/employees()
  - location()/locations()
  - shift()/shifts()
  - audit()/audits()
- Add reusable local helpers per file:
  - employeeLabel, employeesLabel, employeeLabelLower
  - locationLabel, locationsLabel
  - shiftLabel, shiftsLabel
  - auditLabel, auditsLabel

Phase 2 — Patch the full staff/manager mobile experience
- Update nav labels, card titles, CTA text, empty states, filter labels, and toast messages in staff pages/components.
- Ensure manager-specific cards (audits/approvals/stats) use dynamic terms (e.g., “Department Inspection”, “Civil Servant”, “Duty Roster”).
- Keep role names (Admin/Manager/HR/Checker) untouched where they represent platform permissions, not domain nouns.

Phase 3 — Patch workforce analytics/profile/reporting/admin summaries
- Replace remaining Employee/Location/Shift/Audit strings in performance/profile pages.
- Update report tab labels, export headers, modal titles, and Activity Log table labels to terminology-aware versions.
- Make dashboard labels in mixed widgets (like CA location rows) terminology-aware.

Phase 4 — i18n alignment (critical to prevent future misses)
- For sentence-level text currently hardcoded in translation files, move to interpolation-friendly phrasing and inject dynamic terminology values from components.
- Avoid relying on static translation key values for terminology nouns where tenant overrides are required.
- Keep translations for non-terminology text unchanged.

Technical details:
- No backend/database changes needed.
- No auth/permissions logic changes.
- Pattern to use in affected components:
  - import { useTerminology } from "@/hooks/useTerminology";
  - const term = useTerminology();
  - const employeeLabel = term.employee(); etc.
- For mixed strings:
  - Build runtime string with term labels (or pass labels as interpolation params).
- Preserve existing government feature gating (hideForGovernment, module toggles) and only change wording.

Validation checklist after implementation:
1) Staff side:
- /staff
- /staff/schedule
- /staff/shifts
- /staff/shift-pool
- /staff/time-off
2) Workforce/admin:
- /workforce/badge-settings
- /workforce/staff/:id
- /reports (location + employee tabs)
- /activity-log
- admin company detail overview
3) Dashboard widgets:
- Executive/manager cards and popup labels
4) Confirm expected government terms render consistently:
- Civil Servant / Civil Servants
- Department / Departments
- Duty Roster / Duty Rosters
- Inspection / Inspections
