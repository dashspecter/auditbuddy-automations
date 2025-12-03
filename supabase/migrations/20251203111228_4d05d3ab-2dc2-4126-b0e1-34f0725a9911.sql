-- Create attendance kiosks table for device registration
CREATE TABLE public.attendance_kiosks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL DEFAULT 'Attendance Kiosk',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMP WITH TIME ZONE,
  registered_by UUID NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_kiosks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Managers can manage kiosks in their company"
ON public.attendance_kiosks
FOR ALL
USING (
  company_id = get_user_company_id(auth.uid()) AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Users can view kiosks in their company"
ON public.attendance_kiosks
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_attendance_kiosks_updated_at
BEFORE UPDATE ON public.attendance_kiosks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for fast lookups
CREATE INDEX idx_attendance_kiosks_device_token ON public.attendance_kiosks(device_token);
CREATE INDEX idx_attendance_kiosks_location ON public.attendance_kiosks(location_id);