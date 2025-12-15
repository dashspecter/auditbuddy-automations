-- Update the slug generation function to produce cleaner slugs
CREATE OR REPLACE FUNCTION public.generate_kiosk_slug(location_name text, location_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Remove apostrophes and special characters first, then convert to slug
  base_slug := lower(trim(location_name));
  -- Remove apostrophes specifically
  base_slug := regexp_replace(base_slug, '''', '', 'g');
  -- Convert remaining non-alphanumeric to dashes
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing dashes
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  -- Remove consecutive dashes
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  
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

-- Update existing kiosk slugs with the cleaner format
UPDATE attendance_kiosks ak
SET custom_slug = (
  SELECT public.generate_kiosk_slug(l.name, ak.location_id)
  FROM locations l
  WHERE l.id = ak.location_id
)
WHERE custom_slug IS NOT NULL;