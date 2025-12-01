-- Add approval fields to shift_assignments table
ALTER TABLE shift_assignments 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Create function to auto-approve shift assignments when roles match
CREATE OR REPLACE FUNCTION auto_approve_shift_assignment()
RETURNS TRIGGER AS $$
DECLARE
  shift_role TEXT;
  employee_role TEXT;
BEGIN
  -- Get the shift's role
  SELECT role INTO shift_role
  FROM shifts
  WHERE id = NEW.shift_id;
  
  -- Get the employee's role
  SELECT role INTO employee_role
  FROM employees
  WHERE id = NEW.staff_id;
  
  -- If roles match, auto-approve
  IF shift_role = employee_role THEN
    NEW.approval_status := 'approved';
    NEW.approved_at := NOW();
  ELSE
    -- Different role, requires manager approval
    NEW.approval_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-approval
DROP TRIGGER IF EXISTS trigger_auto_approve_shift_assignment ON shift_assignments;
CREATE TRIGGER trigger_auto_approve_shift_assignment
  BEFORE INSERT ON shift_assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_shift_assignment();

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_shift_assignments_approval_status ON shift_assignments(approval_status);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_staff_id ON shift_assignments(staff_id);