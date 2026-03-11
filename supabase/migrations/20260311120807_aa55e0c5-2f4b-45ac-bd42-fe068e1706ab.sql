-- Create company_label_overrides table for terminology customization
CREATE TABLE public.company_label_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label_key text NOT NULL,
  custom_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, label_key)
);

ALTER TABLE public.company_label_overrides ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated company members
CREATE POLICY "Company members can read label overrides"
  ON public.company_label_overrides
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- INSERT: owner/admin only
CREATE POLICY "Owners and admins can insert label overrides"
  ON public.company_label_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_company_role(auth.uid(), 'company_owner')
      OR public.has_company_role(auth.uid(), 'company_admin')
    )
  );

-- UPDATE: owner/admin only
CREATE POLICY "Owners and admins can update label overrides"
  ON public.company_label_overrides
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_company_role(auth.uid(), 'company_owner')
      OR public.has_company_role(auth.uid(), 'company_admin')
    )
  )
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_company_role(auth.uid(), 'company_owner')
      OR public.has_company_role(auth.uid(), 'company_admin')
    )
  );

-- DELETE: owner/admin only
CREATE POLICY "Owners and admins can delete label overrides"
  ON public.company_label_overrides
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_company_role(auth.uid(), 'company_owner')
      OR public.has_company_role(auth.uid(), 'company_admin')
    )
  );

CREATE INDEX idx_company_label_overrides_company_id ON public.company_label_overrides(company_id);