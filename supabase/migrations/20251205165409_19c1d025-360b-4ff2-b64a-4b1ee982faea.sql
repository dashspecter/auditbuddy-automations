-- Add location_id column to tests table
ALTER TABLE public.tests 
ADD COLUMN location_id uuid REFERENCES public.locations(id);

-- Create index for better query performance
CREATE INDEX idx_tests_location_id ON public.tests(location_id);