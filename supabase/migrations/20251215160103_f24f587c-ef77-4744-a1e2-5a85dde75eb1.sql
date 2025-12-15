-- Allow employees (who are not in company_users) to see roles/tasks needed for staff task dashboards

-- 1) employee_roles: allow employees to view roles in their company
CREATE POLICY "Employees can view roles in their company"
ON public.employee_roles
FOR SELECT
USING (
  company_id = public.get_employee_company_id(auth.uid())
);

-- 2) tasks: allow employees to view tasks in their company
-- (tasks contain operational info, not PII)
CREATE POLICY "Employees can view tasks in their company"
ON public.tasks
FOR SELECT
USING (
  company_id = public.get_employee_company_id(auth.uid())
);

-- 3) tasks: allow employees to update/complete tasks that are relevant to them
-- Direct tasks: assigned_to = employee
-- Role tasks: assigned_to is null and assigned_role_id matches employee role
CREATE POLICY "Employees can update tasks assigned to them or their role"
ON public.tasks
FOR UPDATE
USING (
  company_id = public.get_employee_company_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.company_id = public.tasks.company_id
      AND (
        public.tasks.assigned_to = e.id
        OR (
          public.tasks.assigned_to IS NULL
          AND public.tasks.assigned_role_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.employee_roles er
            WHERE er.id = public.tasks.assigned_role_id
              AND er.company_id = e.company_id
              AND lower(er.name) = lower(e.role)
          )
        )
      )
  )
)
WITH CHECK (
  company_id = public.get_employee_company_id(auth.uid())
);

-- 4) task_locations: allow employees to view task_locations for tasks in their company
CREATE POLICY "Employees can view task locations in their company"
ON public.task_locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = public.task_locations.task_id
      AND t.company_id = public.get_employee_company_id(auth.uid())
  )
);
