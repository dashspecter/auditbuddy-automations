-- Create table for clock-in reminder messages
CREATE TABLE public.clock_in_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.clock_in_reminders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view clock-in reminders for their company"
ON public.clock_in_reminders FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
  OR
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage clock-in reminders"
ON public.clock_in_reminders FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_users 
    WHERE user_id = auth.uid() 
    AND company_role IN ('company_admin', 'company_owner')
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_users 
    WHERE user_id = auth.uid() 
    AND company_role IN ('company_admin', 'company_owner')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_clock_in_reminders_updated_at
BEFORE UPDATE ON public.clock_in_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();