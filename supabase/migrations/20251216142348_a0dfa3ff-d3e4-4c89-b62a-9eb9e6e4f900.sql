-- Add target_roles column to clock_in_reminders table
ALTER TABLE public.clock_in_reminders
ADD COLUMN target_roles TEXT[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN public.clock_in_reminders.target_roles IS 'Employee roles that should see this reminder. Empty array means all roles.';