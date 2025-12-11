-- Create a function to check for duplicate submissions
CREATE OR REPLACE FUNCTION public.check_duplicate_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Check if this customer already submitted this survey today
  SELECT COUNT(*) INTO existing_count
  FROM mystery_shopper_submissions
  WHERE template_id = NEW.template_id
    AND DATE(submitted_at) = CURRENT_DATE
    AND (
      (NEW.customer_email IS NOT NULL AND customer_email = NEW.customer_email)
      OR 
      (NEW.customer_email IS NULL AND NEW.customer_phone IS NOT NULL AND customer_phone = NEW.customer_phone)
    );
  
  IF existing_count > 0 THEN
    RAISE EXCEPTION 'You have already submitted this survey today. Please try again tomorrow.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_duplicate_submissions ON public.mystery_shopper_submissions;

CREATE TRIGGER prevent_duplicate_submissions
BEFORE INSERT ON public.mystery_shopper_submissions
FOR EACH ROW
EXECUTE FUNCTION public.check_duplicate_submission();