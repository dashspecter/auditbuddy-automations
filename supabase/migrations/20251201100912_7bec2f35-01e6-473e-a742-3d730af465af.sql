-- Fix the function to have immutable search_path
DROP FUNCTION IF EXISTS create_employee_user(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION create_employee_user(
  employee_email TEXT,
  employee_name TEXT,
  employee_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  temp_password TEXT;
BEGIN
  -- Generate a temporary password (employee should reset it)
  temp_password := encode(gen_random_bytes(16), 'base64');
  
  -- Create the auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    employee_email,
    crypt(temp_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('full_name', employee_name, 'employee_id', employee_id),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;
  
  -- Update employee with user_id
  UPDATE employees SET user_id = new_user_id WHERE id = employee_id;
  
  RETURN new_user_id;
END;
$$;