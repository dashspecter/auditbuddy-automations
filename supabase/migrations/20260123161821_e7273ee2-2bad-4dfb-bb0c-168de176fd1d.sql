-- Add foreign key for created_by to profiles table
-- This enables PostgREST to resolve the creator:created_by join in queries
ALTER TABLE public.staff_events
ADD CONSTRAINT staff_events_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;