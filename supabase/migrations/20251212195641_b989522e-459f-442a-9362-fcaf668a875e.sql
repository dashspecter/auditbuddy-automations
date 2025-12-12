
-- =====================================================
-- SECURITY FIX - Mystery Shopper Template Function (corrected)
-- =====================================================

-- Create mystery shopper template lookup function with correct columns
CREATE OR REPLACE FUNCTION public.get_mystery_shopper_template_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  company_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mst.id,
    mst.name,
    mst.description,
    mst.company_id
  FROM mystery_shopper_templates mst
  WHERE mst.public_token = p_token
    AND mst.is_active = true
  LIMIT 1
$$;

-- Drop any remaining public policies
DROP POLICY IF EXISTS "Anyone can view active templates by token" ON public.mystery_shopper_templates;
DROP POLICY IF EXISTS "Anyone can view equipment interventions" ON public.equipment_interventions;
DROP POLICY IF EXISTS "Anyone can view equipment status history" ON public.equipment_status_history;

-- Ensure employees table has proper policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Users can view employees in their company') THEN
    EXECUTE 'CREATE POLICY "Users can view employees in their company"
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (company_id = get_user_company_id(auth.uid()))';
  END IF;
END $$;

-- Add profile policies if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    EXECUTE 'CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid())';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    EXECUTE 'CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid())';
  END IF;
END $$;
