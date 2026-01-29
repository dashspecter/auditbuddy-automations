
-- Create a trigger to auto-approve training shift assignments
-- This ensures training shifts are immediately visible on the calendar

CREATE OR REPLACE FUNCTION public.auto_approve_training_shift_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a training shift
  IF EXISTS (
    SELECT 1 FROM shifts 
    WHERE id = NEW.shift_id 
    AND shift_type = 'training'
  ) THEN
    -- Auto-approve training shift assignments
    NEW.approval_status := 'approved';
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on insert
DROP TRIGGER IF EXISTS auto_approve_training_shift_assignment_trigger ON shift_assignments;
CREATE TRIGGER auto_approve_training_shift_assignment_trigger
  BEFORE INSERT ON shift_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_training_shift_assignment();

-- Also create trigger on update in case status changes
DROP TRIGGER IF EXISTS auto_approve_training_shift_assignment_update_trigger ON shift_assignments;
CREATE TRIGGER auto_approve_training_shift_assignment_update_trigger
  BEFORE UPDATE ON shift_assignments
  FOR EACH ROW
  WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION public.auto_approve_training_shift_assignment();

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_approve_training_shift_assignment() IS 
'Auto-approves shift assignments for training shifts to ensure immediate calendar visibility. 
Training shifts are created as part of structured training programs and should not require manual approval.';
