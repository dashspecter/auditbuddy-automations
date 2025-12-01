-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Employees can view their assigned shifts" ON public.shifts;

-- Create a security definer function to check if an employee is assigned to a shift
CREATE OR REPLACE FUNCTION public.is_employee_assigned_to_shift(_user_id uuid, _shift_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shift_assignments sa
    JOIN employees e ON sa.staff_id = e.id
    WHERE e.user_id = _user_id
      AND sa.shift_id = _shift_id
  )
$$;

-- Create a security definer function to get employee's company via employees table
CREATE OR REPLACE FUNCTION public.get_employee_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM employees
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Allow employees to view shifts in their company or where they are assigned
CREATE POLICY "Employees can view shifts in their company"
ON public.shifts
FOR SELECT
USING (
  company_id = get_employee_company_id(auth.uid())
);