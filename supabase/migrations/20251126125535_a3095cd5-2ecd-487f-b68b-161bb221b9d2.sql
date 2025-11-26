-- Add short_code column to test_assignments for simpler URLs
ALTER TABLE public.test_assignments
ADD COLUMN short_code TEXT UNIQUE;

-- Create function to generate random short code
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed similar looking chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create trigger to auto-generate short_code on insert
CREATE OR REPLACE FUNCTION set_short_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Generate unique short code
  LOOP
    new_code := generate_short_code();
    SELECT EXISTS(SELECT 1 FROM test_assignments WHERE short_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.short_code := new_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_short_code_trigger
BEFORE INSERT ON public.test_assignments
FOR EACH ROW
EXECUTE FUNCTION set_short_code();

-- Generate short codes for existing assignments
UPDATE public.test_assignments
SET short_code = generate_short_code()
WHERE short_code IS NULL;