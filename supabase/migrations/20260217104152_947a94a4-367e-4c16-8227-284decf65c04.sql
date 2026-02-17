-- Allow employees (staff) to view location form assignments for their company
CREATE POLICY "Employees can view location form assignments"
ON public.location_form_templates
FOR SELECT
USING (
  company_id IN (
    SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()
  )
);

-- Allow employees (staff) to view template versions for their company's templates
CREATE POLICY "Employees can view template versions"
ON public.form_template_versions
FOR SELECT
USING (
  template_id IN (
    SELECT ft.id FROM form_templates ft
    JOIN employees e ON e.company_id = ft.company_id
    WHERE e.user_id = auth.uid()
  )
);