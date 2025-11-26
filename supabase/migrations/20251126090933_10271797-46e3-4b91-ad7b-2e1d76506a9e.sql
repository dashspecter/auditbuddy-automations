-- Drop existing policies for locations
DROP POLICY IF EXISTS "Admins can manage all locations" ON public.locations;
DROP POLICY IF EXISTS "Managers and checkers can view active locations" ON public.locations;

-- Admin and Manager can view ALL locations (including inactive)
CREATE POLICY "Admins and managers can view all locations"
ON public.locations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Checkers can only view ACTIVE locations
CREATE POLICY "Checkers can view active locations"
ON public.locations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'checker'::app_role) AND 
  status = 'active'
);

-- Only Admin and Manager can INSERT, UPDATE, DELETE
CREATE POLICY "Admins and managers can insert locations"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update locations"
ON public.locations
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete locations"
ON public.locations
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);