
-- Add CASCADE to form_submissions foreign keys so templates can be deleted
ALTER TABLE public.form_submissions DROP CONSTRAINT form_submissions_template_id_fkey;
ALTER TABLE public.form_submissions ADD CONSTRAINT form_submissions_template_id_fkey 
  FOREIGN KEY (template_id) REFERENCES public.form_templates(id) ON DELETE CASCADE;

ALTER TABLE public.form_submissions DROP CONSTRAINT form_submissions_template_version_id_fkey;
ALTER TABLE public.form_submissions ADD CONSTRAINT form_submissions_template_version_id_fkey 
  FOREIGN KEY (template_version_id) REFERENCES public.form_template_versions(id) ON DELETE CASCADE;

-- Also fix location_form_templates version FK (missing CASCADE)
ALTER TABLE public.location_form_templates DROP CONSTRAINT location_form_templates_template_version_id_fkey;
ALTER TABLE public.location_form_templates ADD CONSTRAINT location_form_templates_template_version_id_fkey 
  FOREIGN KEY (template_version_id) REFERENCES public.form_template_versions(id) ON DELETE CASCADE;
