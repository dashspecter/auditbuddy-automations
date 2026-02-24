
## Fair Shared Task Scoring

### Problem
Currently, shared (role/location-based) tasks only count toward an employee's score if they personally complete them. Employees who skip shared tasks get the Tasks component excluded entirely from their score -- meaning they aren't penalized. This creates an unfair advantage.

### Solution
Count shared tasks as **assigned to every eligible employee** at the location. If a shared task targets "Chef at Bab's Obor," all 3 Chefs get it in their `tasks_assigned` count. Only the one who completes it gets the `tasks_completed` / `tasks_completed_on_time` credit.

### Eligibility Rules

An employee is "eligible" for a shared task if:
1. **Role match**: The employee's role matches the task's `assigned_role_id` (looked up via `employee_roles` table). Multi-role tasks (via `task_roles` junction) match any of those roles.
2. **Location match**: The employee's `location_id` matches the task's `location_id`.
3. **No role specified**: If a task has no `assigned_role_id` and no `assigned_to` (like "Empty Bins"), all active employees at that location are eligible.
4. **`is_individual: false`**: Only non-individual tasks are shared. Individual tasks with a direct `assigned_to` keep existing behavior.

### Scoring Impact

Using Bab's Obor as an example (3 Chefs, 10 shared Chef tasks in the period):

- **Before**: Chef A completes 8 tasks -> `tasks_assigned=8, task_score=100%`. Chef B completes 2 -> `tasks_assigned=2, task_score=100%`. Chef C completes 0 -> Tasks component excluded.
- **After**: All 3 Chefs get `tasks_assigned=10`. Chef A: `completed=8, score=80%`. Chef B: `completed=2, score=20%`. Chef C: `completed=0, score=0%`.

### How Occurrences Work

For recurring shared tasks, each occurrence (date) counts as a separate "assigned" instance. The system already tracks `occurrence_date` in `task_completions`. For each occurrence date within the period, every eligible employee gets +1 to their `tasks_assigned`.

### Technical Changes

**File: `src/hooks/useEmployeePerformance.ts`**

1. Fetch shared tasks (where `assigned_to IS NULL` and either `assigned_role_id IS NOT NULL` or both are null with `is_individual = false`) for the date range, along with their `task_roles` entries.
2. Fetch `employee_roles` to map role IDs to role names.
3. For each shared task, determine its occurrence dates from `task_completions` records in the period (grouping by `task_id + occurrence_date`).
4. For each employee, count how many shared task occurrences they are eligible for (role + location match) and add to `tasks_assigned`.
5. Keep existing completion counting logic -- only actual completions from `task_completions` add to `tasks_completed` / `tasks_completed_on_time`.

**File: `src/lib/effectiveScore.ts`** -- No changes needed. The `task_used` flag already checks `tasks_assigned > 0`, which will now be true for all eligible employees.

### Edge Cases

- **Task with no role and no location**: Skipped (company-wide tasks without location can't be fairly assigned).
- **Employee with no matching role**: Not eligible, task doesn't count for them.
- **Recurring task with zero completions on a given date**: Still counts as 1 assigned per eligible employee for that occurrence.
- **Non-recurring shared task**: Counts as 1 occurrence in the period.
