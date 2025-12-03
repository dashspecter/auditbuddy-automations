-- Seed audit templates for Fresh Brunch SRL
DO $$
DECLARE
  v_company_id UUID := '421f70ca-0ce0-49f9-8d12-aa1c0ea39c98';
  v_user_id UUID;
  v_template_id UUID;
  v_section_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM company_users WHERE company_id = v_company_id LIMIT 1;
  
  -- 1. BOH Cleaning Check
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'BOH Cleaning check', 'Back of house cleaning inspection checklist', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Kitchen Surfaces', 'Check all kitchen work surfaces', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Countertops clean and sanitized', 'rating', true, 1, '{"min": 1, "max": 5}'),
    (v_section_id, 'Cutting boards sanitized', 'rating', true, 2, '{"min": 1, "max": 5}'),
    (v_section_id, 'Prep tables wiped down', 'rating', true, 3, '{"min": 1, "max": 5}');
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Equipment', 'Check all kitchen equipment', 2) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Ovens cleaned', 'rating', true, 1, '{"min": 1, "max": 5}'),
    (v_section_id, 'Fryers filtered and cleaned', 'rating', true, 2, '{"min": 1, "max": 5}'),
    (v_section_id, 'Refrigerators organized', 'rating', true, 3, '{"min": 1, "max": 5}');

  -- 2. Closing Procedures Checklist
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'Closing Procedures Checklist', 'End-of-day closing checklist ensuring proper equipment shutdown, cleaning completion, and security protocols', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Equipment Shutdown', 'Verify all equipment is properly shut down', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Ovens and grills turned off', 'yesno', true, 1, NULL),
    (v_section_id, 'Coffee machines cleaned and off', 'yesno', true, 2, NULL),
    (v_section_id, 'Display cases secured', 'yesno', true, 3, NULL);
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Security', 'Security checks', 2) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'All doors locked', 'yesno', true, 1, NULL),
    (v_section_id, 'Alarm system activated', 'yesno', true, 2, NULL),
    (v_section_id, 'Cash secured in safe', 'yesno', true, 3, NULL);

  -- 3. Deep Clean Audit
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'Deep Clean Audit', 'Comprehensive deep cleaning inspection', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Deep Cleaning Areas', 'Areas requiring deep cleaning', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Behind equipment cleaned', 'rating', true, 1, '{"min": 1, "max": 5}'),
    (v_section_id, 'Ventilation hoods degreased', 'rating', true, 2, '{"min": 1, "max": 5}'),
    (v_section_id, 'Floor drains cleaned', 'rating', true, 3, '{"min": 1, "max": 5}'),
    (v_section_id, 'Walls and ceiling tiles', 'rating', true, 4, '{"min": 1, "max": 5}');

  -- 4. Evening Shift Audit
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'Evening Shift Audit', 'End of day closing procedures audit', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'End of Day Tasks', 'Evening closing tasks', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Daily sales reconciled', 'yesno', true, 1, NULL),
    (v_section_id, 'Inventory count completed', 'yesno', true, 2, NULL),
    (v_section_id, 'Staff checkout completed', 'yesno', true, 3, NULL);

  -- 5. FOH Cleaning check
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'FOH Cleaning check', 'Front of house cleaning inspection', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Customer Areas', 'Customer-facing areas', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Tables clean and sanitized', 'rating', true, 1, '{"min": 1, "max": 5}'),
    (v_section_id, 'Chairs wiped down', 'rating', true, 2, '{"min": 1, "max": 5}'),
    (v_section_id, 'Floor swept and mopped', 'rating', true, 3, '{"min": 1, "max": 5}');
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Restrooms', 'Customer restrooms', 2) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Toilets and sinks clean', 'rating', true, 1, '{"min": 1, "max": 5}'),
    (v_section_id, 'Supplies stocked', 'yesno', true, 2, NULL),
    (v_section_id, 'Floors clean', 'rating', true, 3, '{"min": 1, "max": 5}');

  -- 6. Food Safety & Hygiene Audit
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'Food Safety & Hygiene Audit', 'Comprehensive food safety inspection covering all critical control points, temperature monitoring, and hygiene standards', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Temperature Control', 'Food temperature monitoring', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Refrigerator temperature (°C)', 'number', true, 1, '{"min": -5, "max": 10}'),
    (v_section_id, 'Freezer temperature (°C)', 'number', true, 2, '{"min": -25, "max": -15}'),
    (v_section_id, 'Hot holding temperature (°C)', 'number', true, 3, '{"min": 60, "max": 100}');
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Personal Hygiene', 'Staff hygiene compliance', 2) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Staff wearing proper attire', 'yesno', true, 1, NULL),
    (v_section_id, 'Hand washing compliance', 'rating', true, 2, '{"min": 1, "max": 5}'),
    (v_section_id, 'Gloves used properly', 'yesno', true, 3, NULL);

  -- 7. Health & Safety Inspection
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'Health & Safety Inspection', 'Complete health and safety audit covering emergency equipment, first aid, fire safety, and workplace hazards', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Fire Safety', 'Fire prevention and equipment', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Fire extinguishers accessible', 'yesno', true, 1, NULL),
    (v_section_id, 'Emergency exits clear', 'yesno', true, 2, NULL),
    (v_section_id, 'Fire alarm functional', 'yesno', true, 3, NULL);
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'First Aid', 'First aid equipment', 2) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'First aid kit stocked', 'yesno', true, 1, NULL),
    (v_section_id, 'First aid kit accessible', 'yesno', true, 2, NULL);

  -- 8. Morning Shift Audit
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'Morning Shift Audit', 'Quick audit for morning shift operations', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Opening Checks', 'Morning opening verification', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Equipment powered on and functional', 'yesno', true, 1, NULL),
    (v_section_id, 'Prep work completed', 'yesno', true, 2, NULL),
    (v_section_id, 'Display cases stocked', 'yesno', true, 3, NULL);

  -- 9. Opening Procedures Checklist
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'Opening Procedures Checklist', 'Complete opening procedures for QSR locations including equipment checks, cleaning verification, and prep station setup', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Equipment Startup', 'Equipment initialization', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'All ovens preheated', 'yesno', true, 1, NULL),
    (v_section_id, 'Coffee machine ready', 'yesno', true, 2, NULL),
    (v_section_id, 'POS systems operational', 'yesno', true, 3, NULL);
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Prep Stations', 'Prep station setup', 2) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Ingredients prepped and portioned', 'yesno', true, 1, NULL),
    (v_section_id, 'Sauces and condiments filled', 'yesno', true, 2, NULL);

  -- 10. Priority Aspects Audit
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'Priority aspects audit', 'Se verifică aspectele esențiale ce țin de buna funcționare a locației în conformitate cu normele ANPC, DSP, DSV și ghidul HACCP.', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Conformitate ANPC', 'Verificări ANPC', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Prețuri afișate corect', 'yesno', true, 1, NULL),
    (v_section_id, 'Informații alergeni disponibile', 'yesno', true, 2, NULL);
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'HACCP', 'Verificări HACCP', 2) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Registru temperaturi completat', 'yesno', true, 1, NULL),
    (v_section_id, 'Trasabilitate produse', 'rating', true, 2, '{"min": 1, "max": 5}');

  -- 11. Standard Location Audit
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'Standard Location Audit', 'Default template for location audits', 'location', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'General Cleanliness', 'Overall cleanliness assessment', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Overall cleanliness rating', 'rating', true, 1, '{"min": 1, "max": 5}'),
    (v_section_id, 'Staff presentation', 'rating', true, 2, '{"min": 1, "max": 5}'),
    (v_section_id, 'Customer service quality', 'rating', true, 3, '{"min": 1, "max": 5}');

  -- 12. Staff Performance Review
  INSERT INTO audit_templates (id, company_id, name, description, template_type, is_global, is_active, created_by)
  VALUES (gen_random_uuid(), v_company_id, 'Staff Performance Review', 'Staff performance evaluation template', 'staff', true, true, v_user_id)
  RETURNING id INTO v_template_id;
  
  INSERT INTO audit_sections (id, template_id, name, description, display_order)
  VALUES (gen_random_uuid(), v_template_id, 'Performance', 'Performance metrics', 1) RETURNING id INTO v_section_id;
  INSERT INTO audit_fields (section_id, name, field_type, is_required, display_order, options) VALUES
    (v_section_id, 'Punctuality', 'rating', true, 1, '{"min": 1, "max": 5}'),
    (v_section_id, 'Task completion', 'rating', true, 2, '{"min": 1, "max": 5}'),
    (v_section_id, 'Communication skills', 'rating', true, 3, '{"min": 1, "max": 5}'),
    (v_section_id, 'Teamwork', 'rating', true, 4, '{"min": 1, "max": 5}');

END $$;