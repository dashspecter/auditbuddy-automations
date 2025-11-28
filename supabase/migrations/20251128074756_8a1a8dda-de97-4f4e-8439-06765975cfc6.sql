-- Create function to check if company trial is valid
CREATE OR REPLACE FUNCTION public.is_trial_valid(company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN trial_ends_at IS NULL THEN false
      WHEN trial_ends_at > NOW() THEN true
      ELSE false
    END
  FROM companies
  WHERE id = company_id;
$$;

-- Create function to check if company subscription is active
CREATE OR REPLACE FUNCTION public.is_subscription_active(company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    status = 'active' AND 
    (trial_ends_at IS NULL OR trial_ends_at > NOW() OR subscription_tier != 'free')
  FROM companies
  WHERE id = company_id;
$$;

-- Add check to ensure trial_ends_at is set for new companies
CREATE OR REPLACE FUNCTION public.set_trial_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set trial to 7 days from now if not already set
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set trial period
DROP TRIGGER IF EXISTS set_company_trial_period ON companies;
CREATE TRIGGER set_company_trial_period
  BEFORE INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_period();

-- Update existing companies without trial_ends_at to have 7-day trial
UPDATE companies 
SET trial_ends_at = created_at + INTERVAL '7 days'
WHERE trial_ends_at IS NULL;

-- Add index for better performance when checking trial status
CREATE INDEX IF NOT EXISTS idx_companies_trial_ends_at ON companies(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
