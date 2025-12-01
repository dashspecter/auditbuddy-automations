-- Add user_id column to employees table to link to auth users
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- Function to create auth user for employee with email
CREATE OR REPLACE FUNCTION create_employee_user(
  employee_email TEXT,
  employee_name TEXT,
  employee_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- RLS policy for employees to view their own shifts via shift_assignments
CREATE POLICY "Employees can view their own shift assignments"
ON shift_assignments FOR SELECT
USING (
  staff_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);