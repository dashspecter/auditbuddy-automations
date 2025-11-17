-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create a more permissive policy for authenticated users to view their own roles
CREATE POLICY "Authenticated users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);