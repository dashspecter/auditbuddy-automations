-- Create equipment table
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model_type TEXT,
  power_supply_type TEXT,
  power_consumption TEXT,
  date_added DATE NOT NULL DEFAULT CURRENT_DATE,
  last_check_date DATE,
  next_check_date DATE,
  last_check_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment_documents table for "How to use" files
CREATE TABLE public.equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment_interventions table
CREATE TABLE public.equipment_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE,
  performed_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  supervised_by_user_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'overdue')),
  description TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  notes TEXT,
  next_check_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_interventions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment
CREATE POLICY "Admins and managers can manage equipment"
ON public.equipment FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Checkers can view active equipment"
ON public.equipment FOR SELECT
USING (has_role(auth.uid(), 'checker') AND status = 'active');

-- RLS Policies for equipment_documents
CREATE POLICY "Admins and managers can manage documents"
ON public.equipment_documents FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "All authenticated users can view documents"
ON public.equipment_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for equipment_interventions
CREATE POLICY "Admins and managers can manage interventions"
ON public.equipment_interventions FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view their assigned interventions"
ON public.equipment_interventions FOR SELECT
USING (
  auth.uid() = performed_by_user_id OR 
  auth.uid() = supervised_by_user_id OR
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update their assigned interventions"
ON public.equipment_interventions FOR UPDATE
USING (auth.uid() = performed_by_user_id OR auth.uid() = supervised_by_user_id)
WITH CHECK (auth.uid() = performed_by_user_id OR auth.uid() = supervised_by_user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_equipment_interventions_updated_at
BEFORE UPDATE ON public.equipment_interventions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for equipment documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-documents', 'equipment-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for equipment documents
CREATE POLICY "Authenticated users can upload equipment documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'equipment-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view equipment documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can delete equipment documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'equipment-documents' AND 
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);