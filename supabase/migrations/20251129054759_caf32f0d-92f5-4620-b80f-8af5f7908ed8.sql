-- Create industries table
CREATE TABLE IF NOT EXISTS public.industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create modules table
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price NUMERIC,
  industry_scope TEXT NOT NULL CHECK (industry_scope IN ('GLOBAL', 'INDUSTRY_SPECIFIC')),
  icon_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create module_industries junction table
CREATE TABLE IF NOT EXISTS public.module_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES public.industries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id, industry_id)
);

-- Add industry_id to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES public.industries(id);

-- Create updated_at trigger for industries
CREATE TRIGGER handle_industries_updated_at
  BEFORE UPDATE ON public.industries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create updated_at trigger for modules
CREATE TRIGGER handle_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default Restaurants/HoReCa industry
INSERT INTO public.industries (name, slug, description, is_active)
VALUES (
  'Restaurants / HoReCa',
  'restaurants_horeca',
  'Hotels, restaurants, cafes, and catering businesses',
  true
);

-- Insert other industries
INSERT INTO public.industries (name, slug, description, is_active)
VALUES 
  ('Construction / Builders', 'construction_builders', 'Construction companies and building contractors', true),
  ('Retail', 'retail', 'Retail stores and shops', true),
  ('Services', 'services', 'Service-based businesses', true),
  ('Other', 'other', 'Other types of businesses', true);

-- Insert existing modules
INSERT INTO public.modules (name, code, description, industry_scope, icon_name, is_active)
VALUES 
  ('Location Audits', 'location_audits', 'Audit scheduling, templates, and compliance tracking', 'INDUSTRY_SPECIFIC', 'ClipboardList', true),
  ('Staff Performance', 'staff_performance', 'Employee audits and performance tracking', 'INDUSTRY_SPECIFIC', 'Users', true),
  ('Equipment Management', 'equipment_management', 'Equipment tracking and maintenance schedules', 'GLOBAL', 'Wrench', true),
  ('Notifications', 'notifications', 'Notification templates and recurring alerts', 'GLOBAL', 'Bell', true),
  ('Reports & Analytics', 'reports', 'Advanced reporting and data analytics', 'GLOBAL', 'Briefcase', true);

-- Map restaurant-specific modules to restaurants_horeca industry
INSERT INTO public.module_industries (module_id, industry_id)
SELECT m.id, i.id
FROM public.modules m
CROSS JOIN public.industries i
WHERE m.industry_scope = 'INDUSTRY_SPECIFIC'
  AND m.code IN ('location_audits', 'staff_performance')
  AND i.slug = 'restaurants_horeca';

-- Migrate existing companies to restaurants_horeca industry
UPDATE public.companies
SET industry_id = (SELECT id FROM public.industries WHERE slug = 'restaurants_horeca')
WHERE industry_id IS NULL;

-- Update company_modules to reference new modules table structure
-- First, let's create a mapping between old module_name and new module codes
-- Then ensure all existing company_modules entries are preserved

-- Enable RLS on new tables
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_industries ENABLE ROW LEVEL SECURITY;

-- RLS policies for industries
CREATE POLICY "Anyone can view active industries"
  ON public.industries FOR SELECT
  USING (is_active = true);

CREATE POLICY "Platform admins can manage industries"
  ON public.industries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for modules
CREATE POLICY "Anyone can view active modules"
  ON public.modules FOR SELECT
  USING (is_active = true);

CREATE POLICY "Platform admins can manage modules"
  ON public.modules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for module_industries
CREATE POLICY "Anyone can view module industry mappings"
  ON public.module_industries FOR SELECT
  USING (true);

CREATE POLICY "Platform admins can manage module industry mappings"
  ON public.module_industries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));