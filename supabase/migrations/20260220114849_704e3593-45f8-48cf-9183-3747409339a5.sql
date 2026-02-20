
ALTER TABLE public.company_modules 
DROP CONSTRAINT company_modules_module_name_check;

ALTER TABLE public.company_modules 
ADD CONSTRAINT company_modules_module_name_check 
CHECK (module_name = ANY (ARRAY[
  'location_audits'::text, 'staff_performance'::text, 'equipment_management'::text, 
  'notifications'::text, 'reports'::text, 'workforce'::text, 'documents'::text, 
  'inventory'::text, 'insights'::text, 'integrations'::text, 'wastage'::text, 
  'qr_forms'::text, 'whatsapp_messaging'::text
]));
