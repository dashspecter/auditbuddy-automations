-- Create a secure onboarding helper to create a company + owner link + modules in one transaction.
-- This avoids client-side multi-step inserts and prevents RLS friction during onboarding.

CREATE OR REPLACE FUNCTION public.create_company_onboarding(
  p_name text,
  p_slug text,
  p_subscription_tier text,
  p_industry_id uuid,
  p_modules text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Company name is required';
  END IF;

  IF p_slug IS NULL OR btrim(p_slug) = '' THEN
    RAISE EXCEPTION 'Company slug is required';
  END IF;

  IF p_modules IS NULL OR array_length(p_modules, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one module must be selected';
  END IF;

  -- Ensure slug uniqueness
  IF EXISTS (SELECT 1 FROM public.companies c WHERE c.slug = p_slug) THEN
    RAISE EXCEPTION 'Company slug already taken. Please choose another.';
  END IF;

  INSERT INTO public.companies (name, slug, status, subscription_tier, industry_id)
  VALUES (p_name, p_slug, 'active', p_subscription_tier, p_industry_id)
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_users (company_id, user_id, company_role)
  VALUES (v_company_id, v_user_id, 'company_owner');

  INSERT INTO public.company_modules (company_id, module_name, is_active)
  SELECT v_company_id, m, true
  FROM unnest(p_modules) AS m;

  RETURN v_company_id;
END;
$$;

-- Lock down who can call it
REVOKE ALL ON FUNCTION public.create_company_onboarding(text, text, text, uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_onboarding(text, text, text, uuid, text[]) TO authenticated;