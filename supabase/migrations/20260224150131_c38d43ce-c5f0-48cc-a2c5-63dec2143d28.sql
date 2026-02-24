ALTER TABLE shifts DROP CONSTRAINT shifts_shift_type_check;
ALTER TABLE shifts ADD CONSTRAINT shifts_shift_type_check 
  CHECK (shift_type = ANY (ARRAY['regular', 'training', 'extra']));