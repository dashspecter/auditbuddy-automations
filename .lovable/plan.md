

# Employee Dossier — Comprehensive Per-Employee Report

## What It Is
A new page (`/employee-dossier/:employeeId`) accessible from the Reports section and from employee cards/lists throughout the app. It consolidates **all** data for a single employee into one view with a configurable date range, and supports PDF export.

## Page Sections

### 1. Header
- Employee avatar, name, role, primary location, additional locations
- Date range picker (preset: last 30 days, this month, last 3 months, custom)
- PDF download button

### 2. Score Overview Card
- Current effective score (large), tier badge (Star Performer, High Achiever, etc.)
- Score trend sparkline (using `performance_monthly_scores` historical data)
- Component breakdown: Attendance, Punctuality, Tasks, Tests, Reviews — each with score + progress bar
- Warning penalty shown if applicable

### 3. Attendance & Punctuality
- Shifts scheduled vs worked vs missed (from performance RPC data)
- Late arrivals count + total late minutes
- Unscheduled check-ins count (from `attendance_logs` where no matching shift)
- Small table/list of attendance events in the date range

### 4. Tasks
- Assigned / Completed / On-time / Overdue counts
- Task completion rate
- List of recent tasks with status indicators

### 5. Audits (Staff Audits)
- List of audits performed on this employee (from `staff_audits`)
- Average audit score, trend
- Each audit links to its detail page

### 6. Tests
- Tests taken / passed, average score
- List of test submissions with scores

### 7. Warnings
- Active warnings in period
- Warning contributions to score penalty

### 8. Score History
- Line chart of monthly effective scores over time (from `performance_monthly_scores`)
- Shows improvement/decline trend

## Data Sources (all existing)
- `useEmployeePerformance` RPC — scores + raw metrics for the date range
- `useMonthlyScores` — historical trend
- `useStaffAudits(employeeId)` — audit records
- `attendance_logs` table — check-in/out detail
- `tasks` + `task_assignments` — task detail
- `test_submissions` — test detail
- `warnings` table — warning records

## Navigation Integration
- Add "Employee Dossier" as a sub-item under Reports (after Employee Performance)
- That entry opens a page with an employee selector (search/dropdown)
- Direct links from employee cards in leaderboards, payroll, etc. via a small icon button

## Files to Create/Edit
- **Create** `src/pages/EmployeeDossier.tsx` — main page
- **Create** `src/components/employee-dossier/` — section components (ScoreOverview, AttendanceSection, TasksSection, AuditsSection, TestsSection, WarningsSection, ScoreHistory)
- **Create** `src/hooks/useEmployeeDossierData.ts` — aggregator hook that fetches all data for one employee + date range
- **Edit** `src/App.tsx` — add route
- **Edit** `src/components/layout/AppSidebar.tsx` — add nav entry under Reports

No database migrations needed — all data already exists.

