
-- Create badge_configurations table
CREATE TABLE public.badge_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Award',
  color TEXT NOT NULL DEFAULT 'text-blue-600 dark:text-blue-400',
  rule_type TEXT NOT NULL DEFAULT 'manual',
  threshold NUMERIC NOT NULL DEFAULT 0,
  streak_months INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, badge_key)
);

-- RLS
ALTER TABLE public.badge_configurations ENABLE ROW LEVEL SECURITY;

-- All company members can read
CREATE POLICY "Company members can read badge configs"
  ON public.badge_configurations
  FOR SELECT
  USING (public.user_in_company(auth.uid(), company_id));

-- Only admins/owners can insert
CREATE POLICY "Admins can insert badge configs"
  ON public.badge_configurations
  FOR INSERT
  WITH CHECK (public.user_is_manager_in_company(auth.uid(), company_id));

-- Only admins/owners can update
CREATE POLICY "Admins can update badge configs"
  ON public.badge_configurations
  FOR UPDATE
  USING (public.user_is_manager_in_company(auth.uid(), company_id));

-- Only admins/owners can delete (custom badges only enforced in app)
CREATE POLICY "Admins can delete badge configs"
  ON public.badge_configurations
  FOR DELETE
  USING (public.user_is_manager_in_company(auth.uid(), company_id));
