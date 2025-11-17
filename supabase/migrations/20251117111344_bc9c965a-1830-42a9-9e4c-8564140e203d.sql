-- Create audit templates table
CREATE TABLE public.audit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('location', 'staff')),
  is_global BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_templates ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Anyone can view active templates"
  ON public.audit_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.audit_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create audit sections table
CREATE TABLE public.audit_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_sections ENABLE ROW LEVEL SECURITY;

-- Sections policies
CREATE POLICY "Anyone can view sections of active templates"
  ON public.audit_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_templates
      WHERE id = template_id AND is_active = true
    )
  );

CREATE POLICY "Admins can manage sections"
  ON public.audit_sections FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create audit fields table
CREATE TABLE public.audit_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.audit_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('rating', 'yesno', 'text', 'number', 'date')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_fields ENABLE ROW LEVEL SECURITY;

-- Fields policies
CREATE POLICY "Anyone can view fields of active templates"
  ON public.audit_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_sections s
      JOIN public.audit_templates t ON s.template_id = t.id
      WHERE s.id = section_id AND t.is_active = true
    )
  );

CREATE POLICY "Admins can manage fields"
  ON public.audit_fields FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add template_id to location_audits
ALTER TABLE public.location_audits 
  ADD COLUMN template_id UUID REFERENCES public.audit_templates(id),
  ADD COLUMN custom_data JSONB;

-- Add template_id to staff_audits
ALTER TABLE public.staff_audits 
  ADD COLUMN template_id UUID REFERENCES public.audit_templates(id),
  ADD COLUMN custom_data JSONB;

-- Add triggers for updated_at
CREATE TRIGGER set_audit_templates_updated_at
  BEFORE UPDATE ON public.audit_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_audit_sections_updated_at
  BEFORE UPDATE ON public.audit_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_audit_fields_updated_at
  BEFORE UPDATE ON public.audit_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create default location audit template
INSERT INTO public.audit_templates (name, description, template_type, is_global, created_by)
SELECT 
  'Standard Location Audit',
  'Default template for location audits',
  'location',
  true,
  id
FROM auth.users
WHERE email = (SELECT email FROM auth.users LIMIT 1)
RETURNING id;

-- Create default staff audit template
INSERT INTO public.audit_templates (name, description, template_type, is_global, created_by)
SELECT 
  'Standard Staff Audit',
  'Default template for staff audits',
  'staff',
  true,
  id
FROM auth.users
WHERE email = (SELECT email FROM auth.users LIMIT 1);