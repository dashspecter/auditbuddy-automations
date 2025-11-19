-- Create notification templates table
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  target_roles TEXT[] NOT NULL DEFAULT '{checker,manager,admin}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification templates
CREATE POLICY "Admins can manage all templates"
ON public.notification_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view templates"
ON public.notification_templates
FOR SELECT
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for performance
CREATE INDEX idx_notification_templates_created_by ON public.notification_templates(created_by);