-- Drop trigger first, then functions, then recreate with proper security
DROP TRIGGER IF EXISTS generate_short_code_trigger ON public.test_assignments;
DROP FUNCTION IF EXISTS set_short_code();
DROP FUNCTION IF EXISTS generate_short_code();

-- Recreate functions with proper security settings
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION set_short_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := generate_short_code();
    SELECT EXISTS(SELECT 1 FROM test_assignments WHERE short_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.short_code := new_code;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER generate_short_code_trigger
BEFORE INSERT ON public.test_assignments
FOR EACH ROW
EXECUTE FUNCTION set_short_code();