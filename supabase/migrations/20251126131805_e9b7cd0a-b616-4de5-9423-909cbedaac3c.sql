-- Create manual_metrics table for custom audit metrics
CREATE TABLE public.manual_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_date DATE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manual_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and managers can view all metrics"
ON public.manual_metrics
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can create metrics"
ON public.manual_metrics
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  AND auth.uid() = created_by
);

CREATE POLICY "Admins and managers can update metrics"
ON public.manual_metrics
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins can delete metrics"
ON public.manual_metrics
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_manual_metrics_updated_at
  BEFORE UPDATE ON public.manual_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better query performance
CREATE INDEX idx_manual_metrics_date ON public.manual_metrics(metric_date DESC);
CREATE INDEX idx_manual_metrics_location ON public.manual_metrics(location_id);
CREATE INDEX idx_manual_metrics_name ON public.manual_metrics(metric_name);