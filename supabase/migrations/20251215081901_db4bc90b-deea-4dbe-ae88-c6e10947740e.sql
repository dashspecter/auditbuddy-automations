-- Add column to companies table to control earnings visibility for staff
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS hide_earnings_from_staff boolean NOT NULL DEFAULT false;