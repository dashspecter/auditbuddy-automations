-- Fix infinite recursion in RLS policies by removing duplicate/recursive policies

-- Drop recursive policies on user_roles table
DROP POLICY IF EXISTS "Platform admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can delete user roles" ON public.user_roles;

-- Drop recursive policy on company_users table  
DROP POLICY IF EXISTS "Users can view their company members" ON public.company_users;

-- Keep the clean policies that use security definer functions:
-- - "Admins can view all user roles" (uses has_role function)
-- - "Admins can insert user roles" (uses has_role function)
-- - "Admins can delete user roles" (uses has_role function)
-- - "Managers can view user roles" (uses has_role function)
-- - "Authenticated users can view their own roles"
-- - "Users can view their own company membership"
-- - "Company owners and admins can manage company users"