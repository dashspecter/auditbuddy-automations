-- Create location_audits table
CREATE TABLE public.location_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  location TEXT NOT NULL,
  audit_date DATE NOT NULL,
  time_start TIME,
  time_end TIME,
  
  -- Compliance Section (ratings 1-5)
  compliance_licenses INTEGER CHECK (compliance_licenses >= 1 AND compliance_licenses <= 5),
  compliance_permits INTEGER CHECK (compliance_permits >= 1 AND compliance_permits <= 5),
  compliance_signage INTEGER CHECK (compliance_signage >= 1 AND compliance_signage <= 5),
  compliance_documentation INTEGER CHECK (compliance_documentation >= 1 AND compliance_documentation <= 5),
  
  -- Back of House Section
  boh_storage INTEGER CHECK (boh_storage >= 1 AND boh_storage <= 5),
  boh_temperature INTEGER CHECK (boh_temperature >= 1 AND boh_temperature <= 5),
  boh_preparation INTEGER CHECK (boh_preparation >= 1 AND boh_preparation <= 5),
  boh_equipment INTEGER CHECK (boh_equipment >= 1 AND boh_equipment <= 5),
  
  -- Cleaning Section
  cleaning_surfaces INTEGER CHECK (cleaning_surfaces >= 1 AND cleaning_surfaces <= 5),
  cleaning_floors INTEGER CHECK (cleaning_floors >= 1 AND cleaning_floors <= 5),
  cleaning_equipment INTEGER CHECK (cleaning_equipment >= 1 AND cleaning_equipment <= 5),
  cleaning_waste INTEGER CHECK (cleaning_waste >= 1 AND cleaning_waste <= 5),
  
  -- Front of House Section
  foh_customer_areas INTEGER CHECK (foh_customer_areas >= 1 AND foh_customer_areas <= 5),
  foh_restrooms INTEGER CHECK (foh_restrooms >= 1 AND foh_restrooms <= 5),
  foh_menu_boards INTEGER CHECK (foh_menu_boards >= 1 AND foh_menu_boards <= 5),
  foh_seating INTEGER CHECK (foh_seating >= 1 AND foh_seating <= 5),
  
  -- Calculated fields
  overall_score INTEGER,
  status TEXT CHECK (status IN ('compliant', 'non-compliant', 'pending')),
  
  -- Additional info
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on location_audits
ALTER TABLE public.location_audits ENABLE ROW LEVEL SECURITY;

-- Location audits policies
CREATE POLICY "Users can view all location audits"
  ON public.location_audits FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create location audits"
  ON public.location_audits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location audits"
  ON public.location_audits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all location audits"
  ON public.location_audits FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete location audits"
  ON public.location_audits FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create staff_audits table
CREATE TABLE public.staff_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  location TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  audit_date DATE NOT NULL,
  
  -- Uniform Section
  uniform_cleanliness INTEGER CHECK (uniform_cleanliness >= 1 AND uniform_cleanliness <= 5),
  uniform_completeness INTEGER CHECK (uniform_completeness >= 1 AND uniform_completeness <= 5),
  uniform_name_tag INTEGER CHECK (uniform_name_tag >= 1 AND uniform_name_tag <= 5),
  
  -- Hygiene Section
  hygiene_hands INTEGER CHECK (hygiene_hands >= 1 AND hygiene_hands <= 5),
  hygiene_hair INTEGER CHECK (hygiene_hair >= 1 AND hygiene_hair <= 5),
  hygiene_nails INTEGER CHECK (hygiene_nails >= 1 AND hygiene_nails <= 5),
  
  -- Behavior Section
  behavior_customer_service INTEGER CHECK (behavior_customer_service >= 1 AND behavior_customer_service <= 5),
  behavior_professionalism INTEGER CHECK (behavior_professionalism >= 1 AND behavior_professionalism <= 5),
  behavior_teamwork INTEGER CHECK (behavior_teamwork >= 1 AND behavior_teamwork <= 5),
  
  -- Performance Section
  performance_speed INTEGER CHECK (performance_speed >= 1 AND performance_speed <= 5),
  performance_accuracy INTEGER CHECK (performance_accuracy >= 1 AND performance_accuracy <= 5),
  performance_knowledge INTEGER CHECK (performance_knowledge >= 1 AND performance_knowledge <= 5),
  
  -- Calculated fields
  overall_score INTEGER,
  status TEXT CHECK (status IN ('compliant', 'non-compliant', 'pending')),
  
  -- Additional info
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on staff_audits
ALTER TABLE public.staff_audits ENABLE ROW LEVEL SECURITY;

-- Staff audits policies
CREATE POLICY "Users can view all staff audits"
  ON public.staff_audits FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create staff audits"
  ON public.staff_audits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own staff audits"
  ON public.staff_audits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all staff audits"
  ON public.staff_audits FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete staff audits"
  ON public.staff_audits FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER set_location_audits_updated_at
  BEFORE UPDATE ON public.location_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_staff_audits_updated_at
  BEFORE UPDATE ON public.staff_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to calculate audit score
CREATE OR REPLACE FUNCTION public.calculate_location_audit_score(audit_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_score INTEGER;
  count_fields INTEGER;
  avg_score INTEGER;
BEGIN
  SELECT 
    COALESCE(compliance_licenses, 0) + COALESCE(compliance_permits, 0) + 
    COALESCE(compliance_signage, 0) + COALESCE(compliance_documentation, 0) +
    COALESCE(boh_storage, 0) + COALESCE(boh_temperature, 0) + 
    COALESCE(boh_preparation, 0) + COALESCE(boh_equipment, 0) +
    COALESCE(cleaning_surfaces, 0) + COALESCE(cleaning_floors, 0) + 
    COALESCE(cleaning_equipment, 0) + COALESCE(cleaning_waste, 0) +
    COALESCE(foh_customer_areas, 0) + COALESCE(foh_restrooms, 0) + 
    COALESCE(foh_menu_boards, 0) + COALESCE(foh_seating, 0),
    16
  INTO total_score, count_fields
  FROM public.location_audits
  WHERE id = audit_id;
  
  -- Calculate percentage (out of 5 per field)
  avg_score := ROUND((total_score::NUMERIC / (count_fields * 5)) * 100);
  
  RETURN avg_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_staff_audit_score(audit_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_score INTEGER;
  count_fields INTEGER;
  avg_score INTEGER;
BEGIN
  SELECT 
    COALESCE(uniform_cleanliness, 0) + COALESCE(uniform_completeness, 0) + 
    COALESCE(uniform_name_tag, 0) +
    COALESCE(hygiene_hands, 0) + COALESCE(hygiene_hair, 0) + COALESCE(hygiene_nails, 0) +
    COALESCE(behavior_customer_service, 0) + COALESCE(behavior_professionalism, 0) + 
    COALESCE(behavior_teamwork, 0) +
    COALESCE(performance_speed, 0) + COALESCE(performance_accuracy, 0) + 
    COALESCE(performance_knowledge, 0),
    12
  INTO total_score, count_fields
  FROM public.staff_audits
  WHERE id = audit_id;
  
  -- Calculate percentage (out of 5 per field)
  avg_score := ROUND((total_score::NUMERIC / (count_fields * 5)) * 100);
  
  RETURN avg_score;
END;
$$;