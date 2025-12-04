-- Add requires_checkin field to locations table
ALTER TABLE public.locations
ADD COLUMN requires_checkin BOOLEAN DEFAULT false;