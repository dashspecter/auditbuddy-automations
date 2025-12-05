-- Add is_template column to tests table
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;