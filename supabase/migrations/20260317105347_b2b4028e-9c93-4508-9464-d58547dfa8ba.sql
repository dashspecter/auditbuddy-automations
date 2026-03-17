
-- Validation trigger: block writes to audit_field_responses and audit_section_responses
-- when the parent location_audit has a NULL location_id
CREATE OR REPLACE FUNCTION public.validate_audit_location_set()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.location_audits
    WHERE id = NEW.audit_id AND location_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'location_not_set: Cannot save response — the audit draft has no location assigned. Please select a location first.';
  END IF;
  RETURN NEW;
END;
$$;

-- Apply to audit_field_responses
DROP TRIGGER IF EXISTS trg_validate_field_response_location ON public.audit_field_responses;
CREATE TRIGGER trg_validate_field_response_location
  BEFORE INSERT OR UPDATE ON public.audit_field_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_audit_location_set();

-- Apply to audit_section_responses
DROP TRIGGER IF EXISTS trg_validate_section_response_location ON public.audit_section_responses;
CREATE TRIGGER trg_validate_section_response_location
  BEFORE INSERT OR UPDATE ON public.audit_section_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_audit_location_set();
