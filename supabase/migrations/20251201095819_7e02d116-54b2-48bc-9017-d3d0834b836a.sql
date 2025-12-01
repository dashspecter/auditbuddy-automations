-- Enable RLS on shifts table if not already enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view shifts in their company" ON shifts;
DROP POLICY IF EXISTS "Users can create shifts in their company" ON shifts;
DROP POLICY IF EXISTS "Users can update shifts in their company" ON shifts;
DROP POLICY IF EXISTS "Users can delete shifts in their company" ON shifts;

-- Create policy for viewing shifts
CREATE POLICY "Users can view shifts in their company"
ON shifts FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
  )
);

-- Create policy for creating shifts
CREATE POLICY "Users can create shifts in their company"
ON shifts FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
  )
);

-- Create policy for updating shifts
CREATE POLICY "Users can update shifts in their company"
ON shifts FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
  )
);

-- Create policy for deleting shifts
CREATE POLICY "Users can delete shifts in their company"
ON shifts FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
  )
);