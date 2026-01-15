-- Add redeemed_location_id column to vouchers table
ALTER TABLE public.vouchers 
ADD COLUMN redeemed_location_id UUID REFERENCES public.locations(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_vouchers_redeemed_location_id ON public.vouchers(redeemed_location_id);