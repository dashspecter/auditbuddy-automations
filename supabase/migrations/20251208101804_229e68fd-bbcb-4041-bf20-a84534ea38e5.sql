-- Add public read access policy for equipment_documents (for QR code scanning)
CREATE POLICY "Public can view equipment documents" 
ON public.equipment_documents 
FOR SELECT 
USING (true);

-- Add public read access policy for companies (for branding on public pages)
CREATE POLICY "Public can view company info" 
ON public.companies 
FOR SELECT 
USING (true);