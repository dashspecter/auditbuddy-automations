-- Add is_template column to tests table
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- Create index for faster template queries
CREATE INDEX IF NOT EXISTS idx_tests_is_template ON public.tests(is_template) WHERE is_template = true;