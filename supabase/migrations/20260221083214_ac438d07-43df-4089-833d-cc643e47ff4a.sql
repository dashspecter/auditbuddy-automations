
-- Update the trigger function to respect manager-set approval status
CREATE OR REPLACE FUNCTION public.auto_approve_shift_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_shift_role TEXT;
  v_employee_role TEXT;
BEGIN
  -- If the application already set approval_status to 'approved' with an approved_at timestamp,
  -- this is a manager-initiated assignment. Respect it and skip role-matching logic.
  IF NEW.approval_status = 'approved' AND NEW.approved_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get the shift role
  SELECT role INTO v_shift_role FROM shifts WHERE id = NEW.shift_id;
  
  -- Get the employee role
  SELECT role INTO v_employee_role FROM employees WHERE id = NEW.staff_id;
  
  -- Auto-approve if roles match, otherwise set to pending
  IF v_shift_role IS NOT NULL AND v_employee_role IS NOT NULL AND v_shift_role = v_employee_role THEN
    NEW.approval_status := 'approved';
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  ELSE
    NEW.approval_status := 'pending';
    NEW.approved_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix existing stuck assignments: update Alex Grecea's pending assignments to approved
UPDATE public.shift_assignments
SET approval_status = 'approved', approved_at = now()
WHERE approval_status = 'pending'
  AND staff_id IN (
    SELECT id FROM employees WHERE full_name = 'Alex Grecea'
  )
  AND shift_id IN (
    SELECT id FROM shifts WHERE shift_date IN ('2025-02-21', '2025-02-22')
  );
