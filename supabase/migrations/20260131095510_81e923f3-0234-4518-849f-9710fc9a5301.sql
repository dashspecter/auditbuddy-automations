-- Drop existing check constraint and add updated one with 'wastage'
ALTER TABLE public.company_modules DROP CONSTRAINT IF EXISTS company_modules_module_name_check;

ALTER TABLE public.company_modules ADD CONSTRAINT company_modules_module_name_check 
CHECK (module_name IN (
  'location_audits',
  'staff_performance', 
  'equipment_management',
  'notifications',
  'reports',
  'workforce',
  'documents',
  'inventory',
  'insights',
  'integrations',
  'wastage'
));