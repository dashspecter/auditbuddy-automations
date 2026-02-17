-- Allow employees (staff) to view form templates for their company
CREATE POLICY "Employees can view form templates"
ON public.form_templates
FOR SELECT
USING (
  company_id IN (
    SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()
  )
);