
-- Drop the old constraint
ALTER TABLE shift_assignments 
DROP CONSTRAINT shift_assignments_status_check;

-- Add the new constraint with 'offered' included
ALTER TABLE shift_assignments 
ADD CONSTRAINT shift_assignments_status_check 
CHECK (status = ANY (ARRAY['assigned'::text, 'confirmed'::text, 'declined'::text, 'completed'::text, 'no-show'::text, 'offered'::text]));
