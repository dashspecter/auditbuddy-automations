-- Fix circular RLS issue on company_users table
-- Users need to be able to view their own company_users record

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their company members" ON public.company_users;

-- Create a new policy that allows users to view their own record
CREATE POLICY "Users can view their own company membership"
ON public.company_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a separate policy for viewing other company members
CREATE POLICY "Users can view their company members"
ON public.company_users
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM public.company_users 
    WHERE user_id = auth.uid()
  )
);