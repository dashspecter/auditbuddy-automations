-- Allow public read access to equipment table for QR code scanning
CREATE POLICY "Anyone can view equipment details"
ON public.equipment
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow public read access to equipment documents for QR code scanning
CREATE POLICY "Anyone can view equipment documents"
ON public.equipment_documents
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow public read access to equipment interventions for QR code scanning
CREATE POLICY "Anyone can view equipment interventions"
ON public.equipment_interventions
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow public read access to equipment status history for QR code scanning
CREATE POLICY "Anyone can view equipment status history"
ON public.equipment_status_history
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow public read access to locations for equipment QR codes
CREATE POLICY "Anyone can view locations"
ON public.locations
FOR SELECT
TO authenticated, anon
USING (true);