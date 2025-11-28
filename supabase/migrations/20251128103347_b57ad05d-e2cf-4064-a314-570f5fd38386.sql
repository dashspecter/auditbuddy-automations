-- Add company_member role to the allowed company roles
ALTER TABLE company_users DROP CONSTRAINT IF EXISTS company_users_company_role_check;

ALTER TABLE company_users ADD CONSTRAINT company_users_company_role_check 
CHECK (company_role IN ('company_owner', 'company_admin', 'company_member'));

-- Now add back the users as company members
INSERT INTO company_users (company_id, user_id, company_role)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  'company_member'
FROM profiles p
WHERE p.email IN ('vlad@lbfc.ro', 'alex@lebab.ro', 'bogdan@lebab.ro', 'doug@lebab.ro')
ON CONFLICT DO NOTHING;