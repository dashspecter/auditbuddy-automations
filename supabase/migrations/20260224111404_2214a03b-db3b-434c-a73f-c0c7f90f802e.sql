ALTER TABLE public.company_modules
  DROP CONSTRAINT company_modules_module_name_check;

ALTER TABLE public.company_modules
  ADD CONSTRAINT company_modules_module_name_check
  CHECK (module_name = ANY (ARRAY[
    'location_audits', 'staff_performance', 'equipment_management',
    'notifications', 'reports', 'workforce', 'documents',
    'inventory', 'insights', 'integrations', 'wastage',
    'qr_forms', 'whatsapp_messaging',
    'payroll', 'cmms', 'corrective_actions', 'operations'
  ]));