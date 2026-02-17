
-- Update check constraint to include company_manager role
ALTER TABLE company_users DROP CONSTRAINT company_users_company_role_check;
ALTER TABLE company_users ADD CONSTRAINT company_users_company_role_check 
  CHECK (company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_manager'::text, 'company_member'::text]));
