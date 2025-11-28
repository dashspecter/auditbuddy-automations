-- Fix remaining recursive policy on company_users
DROP POLICY IF EXISTS "Users can view their company members" ON public.company_users;

-- This policy was causing infinite recursion because it queries company_users within a policy on company_users
-- The "Users can view their own company membership" policy is sufficient for users to see their own record