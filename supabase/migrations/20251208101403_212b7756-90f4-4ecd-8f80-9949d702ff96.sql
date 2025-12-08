-- Add public read access policy for equipment (for QR code scanning)
CREATE POLICY "Public can view equipment by id" 
ON public.equipment 
FOR SELECT 
USING (true);

-- Also allow public read on locations for the join
CREATE POLICY "Public can view locations" 
ON public.locations 
FOR SELECT 
USING (true);