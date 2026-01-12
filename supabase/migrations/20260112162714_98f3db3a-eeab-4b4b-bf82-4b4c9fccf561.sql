-- Add company_id and location_id to staff_events if not exists
ALTER TABLE public.staff_events 
ADD COLUMN IF NOT EXISTS company_id uuid,
ADD COLUMN IF NOT EXISTS location_id uuid;

-- Add foreign key constraints
ALTER TABLE public.staff_events
ADD CONSTRAINT staff_events_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.staff_events
ADD CONSTRAINT staff_events_location_id_fkey 
FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

-- Populate company_id from employee's company for existing records
UPDATE public.staff_events se
SET company_id = e.company_id
FROM public.employees e
WHERE se.staff_id = e.id AND se.company_id IS NULL;

-- Make company_id required after backfill
ALTER TABLE public.staff_events 
ALTER COLUMN company_id SET NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_events_company_type_date 
ON public.staff_events(company_id, event_type, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_staff_events_employee_type_date 
ON public.staff_events(staff_id, event_type, event_date DESC);

-- Drop existing policies to recreate with proper permissions
DROP POLICY IF EXISTS "Managers can create staff events" ON public.staff_events;
DROP POLICY IF EXISTS "Managers can view staff events" ON public.staff_events;

-- Create comprehensive RLS policies for staff_events

-- SELECT: Managers/Admins/Checkers can view all company events, employees can view their own
CREATE POLICY "Admins managers checkers can view staff events"
ON public.staff_events
FOR SELECT
USING (
  (company_id = get_user_company_id(auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'checker'::app_role) OR
    has_company_role(auth.uid(), 'company_owner'::text) OR
    has_company_role(auth.uid(), 'company_admin'::text)
  ))
);

-- SELECT: Employees can view their own events
CREATE POLICY "Employees can view own events"
ON public.staff_events
FOR SELECT
USING (
  staff_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- INSERT: Admins/Managers/Checkers can create events
CREATE POLICY "Managers can create staff events"
ON public.staff_events
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'checker'::app_role) OR
    has_company_role(auth.uid(), 'company_owner'::text) OR
    has_company_role(auth.uid(), 'company_admin'::text)
  )
);

-- UPDATE: Admins/Managers can update events
CREATE POLICY "Managers can update staff events"
ON public.staff_events
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_company_role(auth.uid(), 'company_owner'::text) OR
    has_company_role(auth.uid(), 'company_admin'::text)
  )
);

-- DELETE: Admins/Managers can delete events
CREATE POLICY "Managers can delete staff events"
ON public.staff_events
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_company_role(auth.uid(), 'company_owner'::text) OR
    has_company_role(auth.uid(), 'company_admin'::text)
  )
);