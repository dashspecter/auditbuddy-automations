
-- Create form categories table
CREATE TABLE public.form_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(company_id, slug)
);

-- Enable RLS
ALTER TABLE public.form_categories ENABLE ROW LEVEL SECURITY;

-- View policy
CREATE POLICY "Company members can view form categories"
  ON public.form_categories FOR SELECT
  USING (company_id IN (
    SELECT cu.company_id FROM company_users cu WHERE cu.user_id = auth.uid()
  ));

-- Admin manage policy
CREATE POLICY "Admins can manage form categories"
  ON public.form_categories FOR ALL
  USING (company_id IN (
    SELECT cu.company_id FROM company_users cu
    WHERE cu.user_id = auth.uid() AND cu.company_role IN ('company_owner', 'company_admin')
  ));

-- Seed default categories for companies with qr_forms module
INSERT INTO public.form_categories (company_id, name, slug, display_order, created_by)
SELECT cm.company_id, cat.name, cat.slug, cat.display_order, (
  SELECT cu.user_id FROM company_users cu WHERE cu.company_id = cm.company_id LIMIT 1
)
FROM company_modules cm
CROSS JOIN (
  VALUES 
    ('Temperature', 'temperature', 1),
    ('Hygiene', 'hygiene', 2),
    ('Traceability', 'traceability', 3),
    ('Oil', 'oil', 4),
    ('Other', 'other', 5)
) AS cat(name, slug, display_order)
WHERE cm.module_name = 'qr_forms' AND cm.is_active = true;

-- Index
CREATE INDEX idx_form_categories_company ON public.form_categories(company_id);
