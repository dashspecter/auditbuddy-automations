
-- 1. Remove incorrect platform admin roles for client accounts
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id IN (
    '595298fc-a95f-4adf-86da-d2115808b37d',
    '3445bf86-21b4-45b7-8269-04927bb4357e',
    '5ae75931-b114-4139-8792-1606a242a1cb'
  );

-- 2. Revert onboarding RPC: remove the user_roles INSERT
CREATE OR REPLACE FUNCTION public.create_company_onboarding(
  p_company_name TEXT,
  p_industry TEXT DEFAULT NULL,
  p_size TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user details from auth.users
  SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
  INTO v_user_email, v_user_name
  FROM auth.users
  WHERE id = v_user_id;

  -- Check if user already owns a company
  IF EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = v_user_id AND company_role = 'company_owner'
  ) THEN
    RAISE EXCEPTION 'User already owns a company';
  END IF;

  -- Create the company
  INSERT INTO companies (name, industry, size, country, timezone, status, subscription_tier, onboarding_completed)
  VALUES (p_company_name, p_industry, p_size, p_country, COALESCE(p_timezone, 'UTC'), 'active', 'free', true)
  RETURNING id INTO v_company_id;

  -- Assign the user as company owner
  INSERT INTO company_users (company_id, user_id, company_role)
  VALUES (v_company_id, v_user_id, 'company_owner');

  -- Upsert profile so the owner appears correctly in company user lists
  INSERT INTO profiles (id, email, full_name)
  VALUES (v_user_id, v_user_email, v_user_name)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name);

  -- NO INSERT INTO user_roles here.
  -- Company owners get full company management via company_users.company_role = 'company_owner'.
  -- user_roles.admin is reserved for PLATFORM administrators only.

  -- Initialize default modules
  INSERT INTO company_modules (company_id, module_key, enabled, is_locked)
  VALUES
    (v_company_id, 'dashboard', true, true),
    (v_company_id, 'locations', true, false),
    (v_company_id, 'employees', true, false),
    (v_company_id, 'shifts', true, false),
    (v_company_id, 'attendance', true, false),
    (v_company_id, 'audits', true, false),
    (v_company_id, 'tasks', true, false),
    (v_company_id, 'reports', true, false),
    (v_company_id, 'settings', true, true),
    (v_company_id, 'training', false, false),
    (v_company_id, 'corrective_actions', false, false),
    (v_company_id, 'maintenance', false, false),
    (v_company_id, 'tests', false, false),
    (v_company_id, 'mystery_shopper', false, false),
    (v_company_id, 'vouchers', false, false),
    (v_company_id, 'marketplace', false, false)
  ON CONFLICT (company_id, module_key) DO NOTHING;

  RETURN v_company_id;
END;
$$;
