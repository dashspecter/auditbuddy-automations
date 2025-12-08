-- Add ID document fields to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS localitate text,
ADD COLUMN IF NOT EXISTS serie_id text,
ADD COLUMN IF NOT EXISTS numar_id text,
ADD COLUMN IF NOT EXISTS valabilitate_id date,
ADD COLUMN IF NOT EXISTS cnp text;