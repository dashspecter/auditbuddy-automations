

# Seed Mock Data for Government Institution Account

The Government Institution company is completely empty — no locations, employees, departments, audits, tasks, or any operational data. This plan seeds realistic Romanian municipal data across all features so the dashboard shows meaningful numbers.

## Data to Insert (via SQL migrations)

### 1. Departments (5)
Urbanism, Resurse Umane, Servicii Publice, Financiar-Contabilitate, Tehnic-Întreținere

### 2. Locations (4)
Primăria Centrală, Direcția Taxe și Impozite, Centrul de Relații cu Cetățenii, Depozitul Municipal

### 3. Employee Roles (6)
Director Departament, Consilier Superior, Inspector, Referent, Operator Registratură, Tehnician

### 4. Employees (15)
Realistic Romanian names, spread across locations and departments, mix of roles. All `status = 'active'`.

### 5. Audit Template + Sections + Fields
One "Inspecție Clădire Publică" template with 4 sections (Conformitate Documente, Curățenie, Securitate, Echipamente), each with 3-4 fields.

### 6. Location Audits (12)
Spread over last 60 days across all 4 locations. Mix of statuses (compliant, non_compliant, completed). Scores ranging 55-95%. Section scores in `cached_section_scores`.

### 7. Tasks (10)
Municipal-relevant tasks (Reparație acoperiș, Actualizare registru, Pregătire raport buget, etc.) with mix of statuses (pending, completed, in_progress), priorities, and due dates.

### 8. Training Programs (3) + Assignments (8)
Programs: Protecția Muncii, GDPR, Proceduri Administrație Publică. Assignments spread across employees with mix of statuses (completed, in_progress, planned, overdue).

### 9. Corrective Actions (5)
Linked to locations, various severities (critical, major, minor), mix of open/in_progress/closed statuses.

### 10. Shifts + Shift Assignments + Attendance Logs (last 7 days)
Daily shifts for locations, assignments for employees, attendance logs with check-in/check-out times, some late arrivals.

### 11. Equipment (6)
Municipal equipment across locations (Generator electric, Sistem HVAC, Centrală termică, etc.) with various statuses.

## Technical Notes

- All inserts use the company_id `546575db-dc0f-409f-8da2-170054b258f6`
- Owner user_id `f9896025-8366-40eb-abce-73f2bfddd2aa` used as `created_by` where needed
- UUIDs generated via `gen_random_uuid()`
- Dates relative to `CURRENT_DATE` so data stays fresh
- Will be executed as a single SQL migration with multiple INSERT statements
- No schema changes needed — all tables already exist

