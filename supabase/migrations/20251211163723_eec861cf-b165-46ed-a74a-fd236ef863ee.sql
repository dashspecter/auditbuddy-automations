-- Allow anyone to read active mystery shopper templates by public_token (for public form)
DROP POLICY IF EXISTS "Anyone can view active templates by token" ON public.mystery_shopper_templates;

CREATE POLICY "Anyone can view active templates by token"
ON public.mystery_shopper_templates
FOR SELECT
USING (is_active = true);

-- Allow anyone to read questions for active templates (for public form)
DROP POLICY IF EXISTS "Anyone can view questions for active templates" ON public.mystery_shopper_questions;

CREATE POLICY "Anyone can view questions for active templates"
ON public.mystery_shopper_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mystery_shopper_templates t 
    WHERE t.id = template_id AND t.is_active = true
  )
);