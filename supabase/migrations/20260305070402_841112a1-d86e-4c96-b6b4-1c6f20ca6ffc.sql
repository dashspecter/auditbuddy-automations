
-- Part A: Fix equipment_interventions RLS
-- 1. Backfill company_id from created_by user's company
UPDATE public.equipment_interventions
SET company_id = public.get_user_company_id(created_by)
WHERE company_id IS NULL;

-- 2. Make company_id NOT NULL
ALTER TABLE public.equipment_interventions ALTER COLUMN company_id SET NOT NULL;

-- 3. Drop all 4 existing policies
DROP POLICY IF EXISTS "Admins and managers can manage interventions" ON public.equipment_interventions;
DROP POLICY IF EXISTS "Users can view interventions in their company" ON public.equipment_interventions;
DROP POLICY IF EXISTS "Users can view their assigned interventions" ON public.equipment_interventions;
DROP POLICY IF EXISTS "Users can create interventions" ON public.equipment_interventions;

-- 4. Create company-scoped policies
CREATE POLICY "Company users can view interventions"
ON public.equipment_interventions FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company users can manage interventions"
ON public.equipment_interventions FOR ALL TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Part B: Fix recurring_maintenance_schedules
-- 1. Add company_id column
ALTER TABLE public.recurring_maintenance_schedules
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 2. Backfill from equipment's company_id
UPDATE public.recurring_maintenance_schedules rms
SET company_id = e.company_id
FROM public.equipment e
WHERE rms.equipment_id = e.id
AND rms.company_id IS NULL;

-- 3. Backfill any remaining from created_by
UPDATE public.recurring_maintenance_schedules
SET company_id = public.get_user_company_id(created_by)
WHERE company_id IS NULL;

-- 4. Make NOT NULL
ALTER TABLE public.recurring_maintenance_schedules ALTER COLUMN company_id SET NOT NULL;

-- 5. Drop existing policies
DROP POLICY IF EXISTS "Admins and managers can manage schedules" ON public.recurring_maintenance_schedules;
DROP POLICY IF EXISTS "Users can view schedules" ON public.recurring_maintenance_schedules;

-- 6. Create company-scoped policies
CREATE POLICY "Company users can view schedules"
ON public.recurring_maintenance_schedules FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company users can manage schedules"
ON public.recurring_maintenance_schedules FOR ALL TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
