-- Drop the overload with defaults then recreate with label seeding
DROP FUNCTION IF EXISTS public.create_company_onboarding(text, text, text, uuid, text[]);

CREATE FUNCTION public.create_company_onboarding(p_name text, p_slug text, p_subscription_tier text, p_industry_id uuid, p_modules text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_industry_slug text;
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

  -- Seed label overrides for Government industry
  IF p_industry_id IS NOT NULL THEN
    SELECT slug INTO v_industry_slug FROM public.industries WHERE id = p_industry_id;
    IF v_industry_slug = 'government' THEN
      INSERT INTO public.company_label_overrides (company_id, label_key, custom_value)
      VALUES
        (v_company_id, 'company', 'Institution'),
        (v_company_id, 'employees', 'Civil Servants'),
        (v_company_id, 'locations', 'Departments'),
        (v_company_id, 'audits', 'Inspections'),
        (v_company_id, 'manager', 'Department Head'),
        (v_company_id, 'owner', 'Mayor / Secretary General'),
        (v_company_id, 'shifts', 'Duty Rosters'),
        (v_company_id, 'equipment', 'Municipal Assets')
      ON CONFLICT (company_id, label_key) DO NOTHING;
    END IF;
  END IF;

  RETURN v_company_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_company_onboarding(text, text, text, uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_onboarding(text, text, text, uuid, text[]) TO authenticated;