-- Fix cross-company data leak: drop overly permissive public policies on locations and departments
-- Kiosks are unaffected because they use SECURITY DEFINER RPCs that bypass RLS

DROP POLICY IF EXISTS "Public can view locations" ON public.locations;
DROP POLICY IF EXISTS "Public can view departments" ON public.departments;

NOTIFY pgrst, 'reload schema';