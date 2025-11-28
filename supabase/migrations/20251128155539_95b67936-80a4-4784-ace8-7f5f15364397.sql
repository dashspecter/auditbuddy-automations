-- Add approval fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

-- Update default status to 'pending' for new companies
ALTER TABLE public.companies 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add comments for clarity
COMMENT ON COLUMN public.companies.status IS 'Company status: pending, active, paused, suspended';
COMMENT ON COLUMN public.companies.approved_at IS 'Timestamp when company was approved by platform admin';
COMMENT ON COLUMN public.companies.approved_by IS 'User ID of platform admin who approved the company';

-- Update the set_trial_period function to only set trial for approved companies
CREATE OR REPLACE FUNCTION public.set_trial_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only set trial period when company is approved (status changed from pending to active)
  IF OLD.status = 'pending' AND NEW.status = 'active' AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '7 days';
    NEW.approved_at := NOW();
  END IF;
  RETURN NEW;
END;
$function$;