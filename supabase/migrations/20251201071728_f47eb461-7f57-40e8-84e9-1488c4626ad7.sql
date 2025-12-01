-- First, update the check constraint to allow the new module names
ALTER TABLE company_modules DROP CONSTRAINT IF EXISTS company_modules_module_name_check;
ALTER TABLE company_modules ADD CONSTRAINT company_modules_module_name_check 
  CHECK (module_name = ANY (ARRAY[
    'location_audits', 
    'staff_performance', 
    'equipment_management', 
    'notifications', 
    'reports',
    'workforce',
    'documents',
    'inventory',
    'insights',
    'integrations'
  ]));

-- Insert core modules with correct names
INSERT INTO modules (code, name, description, industry_scope, icon_name, is_active) VALUES
  ('location_audits', 'Location Audits', 'Perform and manage location audits with custom templates', 'GLOBAL', 'ClipboardList', true),
  ('staff_performance', 'Staff Performance', 'Track and analyze staff performance metrics', 'GLOBAL', 'Users', true),
  ('equipment_management', 'Equipment Management', 'Track equipment maintenance and interventions', 'GLOBAL', 'Wrench', true),
  ('notifications', 'Notifications & Alerts', 'Send automated notifications and alerts', 'GLOBAL', 'Bell', true),
  ('reports', 'Reports & Analytics', 'Generate and view detailed reports', 'GLOBAL', 'FileText', true),
  ('workforce', 'Workforce Management', 'Manage staff, shifts, attendance, and payroll', 'GLOBAL', 'Users', true),
  ('documents', 'Document Center', 'Manage documents, training programs, and compliance', 'GLOBAL', 'Briefcase', true),
  ('inventory', 'Inventory Management', 'Track inventory levels and manage stock', 'INDUSTRY_SPECIFIC', 'Package', true),
  ('insights', 'AI Insights', 'View AI-powered insights and analytics', 'GLOBAL', 'BarChart', true),
  ('integrations', 'Integrations', 'Connect with external systems and APIs', 'GLOBAL', 'Plug', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  industry_scope = EXCLUDED.industry_scope,
  icon_name = EXCLUDED.icon_name,
  is_active = EXCLUDED.is_active;

-- Get hospitality industry ID and link modules
DO $$
DECLARE
  v_hospitality_id UUID;
  v_module_id UUID;
BEGIN
  SELECT id INTO v_hospitality_id 
  FROM industries 
  WHERE slug = 'hospitality-food-service' 
  LIMIT 1;

  IF v_hospitality_id IS NOT NULL THEN
    FOR v_module_id IN SELECT id FROM modules WHERE is_active = true
    LOOP
      INSERT INTO module_industries (module_id, industry_id)
      VALUES (v_module_id, v_hospitality_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Update Fresh Brunch SRL to have hospitality industry
UPDATE companies 
SET industry_id = (SELECT id FROM industries WHERE slug = 'hospitality-food-service' LIMIT 1)
WHERE name = 'Fresh Brunch SRL';

-- Activate all modules for Fresh Brunch SRL
INSERT INTO company_modules (company_id, module_name, is_active)
VALUES
  ('421f70ca-0ce0-49f9-8d12-aa1c0ea39c98', 'location_audits', true),
  ('421f70ca-0ce0-49f9-8d12-aa1c0ea39c98', 'staff_performance', true),
  ('421f70ca-0ce0-49f9-8d12-aa1c0ea39c98', 'equipment_management', true),
  ('421f70ca-0ce0-49f9-8d12-aa1c0ea39c98', 'notifications', true),
  ('421f70ca-0ce0-49f9-8d12-aa1c0ea39c98', 'reports', true),
  ('421f70ca-0ce0-49f9-8d12-aa1c0ea39c98', 'workforce', true),
  ('421f70ca-0ce0-49f9-8d12-aa1c0ea39c98', 'documents', true),
  ('421f70ca-0ce0-49f9-8d12-aa1c0ea39c98', 'inventory', true),
  ('421f70ca-0ce0-49f9-8d12-aa1c0ea39c98', 'insights', true),
  ('421f70ca-0ce0-49f9-8d12-aa1c0ea39c98', 'integrations', true)
ON CONFLICT (company_id, module_name) DO UPDATE SET is_active = true;