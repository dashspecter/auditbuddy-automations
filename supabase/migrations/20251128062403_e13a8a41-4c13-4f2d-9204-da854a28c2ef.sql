-- Create companies table for multi-tenant B2B structure
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_users junction table (company-level roles)
CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_role TEXT NOT NULL CHECK (company_role IN ('company_owner', 'company_admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Create company_modules table for module activation
CREATE TABLE IF NOT EXISTS public.company_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL CHECK (module_name IN ('location_audits', 'staff_performance', 'equipment_management', 'notifications', 'reports')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deactivated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(company_id, module_name)
);

-- Add company_id to all existing tables
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.location_audits ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.staff_audits ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.audit_templates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.notification_templates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.equipment_interventions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.manual_metrics ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.document_categories ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create "Fresh Brunch SRL" company and migrate existing data
INSERT INTO public.companies (id, name, slug, status, subscription_tier)
VALUES ('00000000-0000-0000-0000-000000000001', 'Fresh Brunch SRL', 'fresh-brunch-srl', 'active', 'professional');

-- Activate all modules for Fresh Brunch SRL
INSERT INTO public.company_modules (company_id, module_name, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'location_audits', true),
  ('00000000-0000-0000-0000-000000000001', 'staff_performance', true),
  ('00000000-0000-0000-0000-000000000001', 'equipment_management', true),
  ('00000000-0000-0000-0000-000000000001', 'notifications', true),
  ('00000000-0000-0000-0000-000000000001', 'reports', true);

-- Update all existing data to belong to Fresh Brunch SRL
UPDATE public.locations SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.employees SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.equipment SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.location_audits SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.staff_audits SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.audit_templates SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.notifications SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.notification_templates SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.equipment_interventions SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.manual_metrics SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.tests SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.documents SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.document_categories SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- Make company_id NOT NULL after data migration
ALTER TABLE public.locations ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.employees ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.equipment ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.audit_templates ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.document_categories ALTER COLUMN company_id SET NOT NULL;

-- Create helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_users
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Create helper function to check if user has company role
CREATE OR REPLACE FUNCTION public.has_company_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE user_id = _user_id AND company_role = _role
  )
$$;

-- Create helper function to check if company has module active
CREATE OR REPLACE FUNCTION public.company_has_module(_company_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_modules
    WHERE company_id = _company_id 
      AND module_name = _module 
      AND is_active = true
  )
$$;

-- Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

-- RLS policies for companies table
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = get_user_company_id(auth.uid()));

CREATE POLICY "Company owners and admins can update their company"
  ON public.companies FOR UPDATE
  USING (
    id = get_user_company_id(auth.uid()) AND
    (has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))
  );

-- RLS policies for company_users table
CREATE POLICY "Users can view their company members"
  ON public.company_users FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company owners and admins can manage company users"
  ON public.company_users FOR ALL
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))
  );

-- RLS policies for company_modules table
CREATE POLICY "Users can view their company modules"
  ON public.company_modules FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company owners and admins can manage modules"
  ON public.company_modules FOR ALL
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_company_role(auth.uid(), 'company_owner') OR has_company_role(auth.uid(), 'company_admin'))
  );

-- Update RLS policies for existing tables to check company_id

-- Locations
DROP POLICY IF EXISTS "Admins and managers can view all locations" ON public.locations;
DROP POLICY IF EXISTS "Checkers can view active locations" ON public.locations;
DROP POLICY IF EXISTS "Anyone can view locations" ON public.locations;
DROP POLICY IF EXISTS "Anyone can view locations through test assignments" ON public.locations;

CREATE POLICY "Users can view locations in their company"
  ON public.locations FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins and managers can manage locations in their company"
  ON public.locations FOR ALL
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- Employees
DROP POLICY IF EXISTS "Admins and managers can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Checkers can view active employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can view employees through test assignments" ON public.employees;

CREATE POLICY "Users can view employees in their company"
  ON public.employees FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins and managers can manage employees in their company"
  ON public.employees FOR ALL
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- Equipment
DROP POLICY IF EXISTS "Admins and managers can manage equipment" ON public.equipment;
DROP POLICY IF EXISTS "Checkers can view active equipment" ON public.equipment;
DROP POLICY IF EXISTS "Anyone can view equipment details" ON public.equipment;

CREATE POLICY "Users can view equipment in their company"
  ON public.equipment FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins and managers can manage equipment in their company"
  ON public.equipment FOR ALL
  USING (
    company_id = get_user_company_id(auth.uid()) AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_company_id ON public.locations(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_company_id ON public.equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_location_audits_company_id ON public.location_audits(company_id);
CREATE INDEX IF NOT EXISTS idx_staff_audits_company_id ON public.staff_audits(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);

-- Add trigger for updated_at on companies table
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();