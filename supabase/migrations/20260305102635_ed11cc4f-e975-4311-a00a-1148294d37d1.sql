
-- Fix onboarding RPC to assign admin role in user_roles for new company owners
CREATE OR REPLACE FUNCTION public.create_company_onboarding(
  p_name text,
  p_slug text,
  p_subscription_tier text DEFAULT 'free',
  p_industry_id uuid DEFAULT NULL,
  p_modules text[] DEFAULT NULL
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

  IF EXISTS (SELECT 1 FROM public.companies c WHERE c.slug = p_slug) THEN
    RAISE EXCEPTION 'Company slug already taken. Please choose another.';
  END IF;

  INSERT INTO public.companies (name, slug, status, subscription_tier, industry_id)
  VALUES (p_name, p_slug, 'active', p_subscription_tier, p_industry_id)
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_users (company_id, user_id, company_role)
  VALUES (v_company_id, v_user_id, 'company_owner');

  -- Assign admin role in user_roles so RLS policies work from day one
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ensure profile exists for the onboarding user
  INSERT INTO public.profiles (id, email, full_name)
  SELECT v_user_id, u.email, u.raw_user_meta_data->>'full_name'
  FROM auth.users u WHERE u.id = v_user_id
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  IF p_modules IS NOT NULL AND array_length(p_modules, 1) IS NOT NULL THEN
    INSERT INTO public.company_modules (company_id, module_name, is_active)
    SELECT v_company_id, m, true
    FROM unnest(p_modules) AS m;
  END IF;

  RETURN v_company_id;
END;
$$;
