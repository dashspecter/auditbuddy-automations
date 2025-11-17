-- Drop the staff_audits table and related function
DROP TABLE IF EXISTS public.staff_audits CASCADE;

-- Drop the calculate staff audit score function
DROP FUNCTION IF EXISTS public.calculate_staff_audit_score(uuid);

-- Update any templates that are staff type to be inactive or delete them
UPDATE public.audit_templates 
SET is_active = false 
WHERE template_type = 'staff';

-- Note: We keep the enum value 'staff' in case there's existing data, 
-- but we won't use it going forward