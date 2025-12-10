-- Add unique constraint for location_id and date combination on location_daily_ops
ALTER TABLE public.location_daily_ops 
ADD CONSTRAINT location_daily_ops_location_date_unique 
UNIQUE (location_id, date);