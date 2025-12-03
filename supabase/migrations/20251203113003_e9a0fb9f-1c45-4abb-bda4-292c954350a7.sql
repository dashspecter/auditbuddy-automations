-- Add latitude and longitude columns to locations for weather
ALTER TABLE public.locations 
ADD COLUMN latitude NUMERIC(10, 7),
ADD COLUMN longitude NUMERIC(10, 7);

-- Add some default coordinates for existing locations (Bucharest area)
COMMENT ON COLUMN public.locations.latitude IS 'Latitude coordinate for weather and mapping';
COMMENT ON COLUMN public.locations.longitude IS 'Longitude coordinate for weather and mapping';