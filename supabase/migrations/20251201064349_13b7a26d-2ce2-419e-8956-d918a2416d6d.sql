-- Create equipment_checks table
CREATE TABLE IF NOT EXISTS public.equipment_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  performed_by UUID NOT NULL,
  notes TEXT,
  result_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT equipment_checks_result_status_check CHECK (result_status IN ('passed', 'failed', 'needs_attention'))
);

-- Create equipment_maintenance_events table
CREATE TABLE IF NOT EXISTS public.equipment_maintenance_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  technician TEXT NOT NULL,
  description TEXT NOT NULL,
  cost NUMERIC(10,2),
  parts_used JSONB,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equipment_checks_equipment_id ON public.equipment_checks(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_checks_check_date ON public.equipment_checks(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_events_equipment_id ON public.equipment_maintenance_events(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_events_event_date ON public.equipment_maintenance_events(event_date DESC);

-- Enable RLS
ALTER TABLE public.equipment_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment_checks
CREATE POLICY "Users can view equipment checks in their company"
  ON public.equipment_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_checks.equipment_id
      AND e.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can create equipment checks"
  ON public.equipment_checks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_checks.equipment_id
      AND e.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Managers can update equipment checks"
  ON public.equipment_checks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_checks.equipment_id
      AND e.company_id = get_user_company_id(auth.uid())
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- RLS Policies for equipment_maintenance_events
CREATE POLICY "Users can view maintenance events in their company"
  ON public.equipment_maintenance_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_maintenance_events.equipment_id
      AND e.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can create maintenance events"
  ON public.equipment_maintenance_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_maintenance_events.equipment_id
      AND e.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Managers can update maintenance events"
  ON public.equipment_maintenance_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_maintenance_events.equipment_id
      AND e.company_id = get_user_company_id(auth.uid())
    ) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );