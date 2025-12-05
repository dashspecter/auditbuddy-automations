-- Add target_employee_ids column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN target_employee_ids uuid[] DEFAULT '{}';

-- Make target_roles nullable since we can now target employees instead
ALTER TABLE public.notifications 
ALTER COLUMN target_roles DROP NOT NULL,
ALTER COLUMN target_roles SET DEFAULT '{}';