-- Create junction table for template-location many-to-many relationship
CREATE TABLE IF NOT EXISTS public.template_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(template_id, location_id)
);

-- Enable RLS
ALTER TABLE public.template_locations ENABLE ROW LEVEL SECURITY;

-- Admins and managers can manage template-location assignments
CREATE POLICY "Admins and managers can manage template locations"
ON public.template_locations
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Checkers can view template-location assignments
CREATE POLICY "Checkers can view template locations"
ON public.template_locations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'checker'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Migrate existing template location_id data to junction table
INSERT INTO public.template_locations (template_id, location_id)
SELECT id, location_id
FROM public.audit_templates
WHERE location_id IS NOT NULL
ON CONFLICT (template_id, location_id) DO NOTHING;

-- Create index for performance
CREATE INDEX idx_template_locations_template_id ON public.template_locations(template_id);
CREATE INDEX idx_template_locations_location_id ON public.template_locations(location_id);