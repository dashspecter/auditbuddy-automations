-- Create shift_presets table
CREATE TABLE IF NOT EXISTS shift_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Create index for better query performance
CREATE INDEX idx_shift_presets_company ON shift_presets(company_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE shift_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company's shift presets"
ON shift_presets FOR SELECT
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins and managers can manage shift presets"
ON shift_presets FOR ALL
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_company_role(auth.uid(), 'company_owner') OR 
    has_company_role(auth.uid(), 'company_admin')
  )
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_company_role(auth.uid(), 'company_owner') OR 
    has_company_role(auth.uid(), 'company_admin')
  )
);

-- Insert default shift presets for existing companies
INSERT INTO shift_presets (company_id, name, start_time, end_time, display_order)
SELECT 
  c.id,
  preset.name,
  preset.start_time::TIME,
  preset.end_time::TIME,
  preset.display_order
FROM companies c
CROSS JOIN (
  VALUES 
    ('Morning Shift', '06:00', '14:00', 1),
    ('Day Shift', '09:00', '17:00', 2),
    ('Evening Shift', '14:00', '22:00', 3),
    ('Night Shift', '22:00', '06:00', 4),
    ('Split Shift AM', '07:00', '11:00', 5),
    ('Split Shift PM', '17:00', '21:00', 6),
    ('Full Day', '08:00', '20:00', 7)
) AS preset(name, start_time, end_time, display_order)
ON CONFLICT (company_id, name) DO NOTHING;