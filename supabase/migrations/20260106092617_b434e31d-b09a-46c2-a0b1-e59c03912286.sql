-- Drop the insecure public policies that allow unauthenticated access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- The secure versions already exist with roles={authenticated}:
-- "Users can view own profile" - SELECT for authenticated users
-- "Users can update own profile" - UPDATE for authenticated users
-- So we don't need to recreate them