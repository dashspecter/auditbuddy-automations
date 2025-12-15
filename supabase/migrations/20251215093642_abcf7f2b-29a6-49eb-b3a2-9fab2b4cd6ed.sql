-- Add custom_slug column to attendance_kiosks for friendly URLs
ALTER TABLE public.attendance_kiosks 
ADD COLUMN IF NOT EXISTS custom_slug TEXT UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_attendance_kiosks_custom_slug ON public.attendance_kiosks(custom_slug);

-- Create function to generate slug from location name
CREATE OR REPLACE FUNCTION public.generate_kiosk_slug(location_name TEXT, location_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert location name to URL-friendly slug
  base_slug := lower(regexp_replace(trim(location_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g'); -- Remove leading/trailing dashes
  
  -- If slug is empty, use location_id
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'location-' || left(location_id::text, 8);
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM attendance_kiosks WHERE custom_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$function$;

-- Create trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION public.set_kiosk_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  location_name TEXT;
BEGIN
  -- Only set slug if not provided
  IF NEW.custom_slug IS NULL THEN
    SELECT name INTO location_name FROM locations WHERE id = NEW.location_id;
    NEW.custom_slug := public.generate_kiosk_slug(location_name, NEW.location_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_set_kiosk_slug ON public.attendance_kiosks;
CREATE TRIGGER trg_set_kiosk_slug
  BEFORE INSERT ON public.attendance_kiosks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_kiosk_slug();

-- Update existing kiosks with slugs
DO $$
DECLARE
  kiosk_record RECORD;
  location_name TEXT;
BEGIN
  FOR kiosk_record IN SELECT ak.id, ak.location_id FROM attendance_kiosks ak WHERE ak.custom_slug IS NULL
  LOOP
    SELECT name INTO location_name FROM locations WHERE id = kiosk_record.location_id;
    UPDATE attendance_kiosks 
    SET custom_slug = public.generate_kiosk_slug(location_name, kiosk_record.location_id)
    WHERE id = kiosk_record.id;
  END LOOP;
END $$;