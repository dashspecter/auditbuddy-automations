-- Add renewal tracking fields to documents table
ALTER TABLE public.documents 
ADD COLUMN renewal_date DATE,
ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
ADD COLUMN document_type TEXT DEFAULT 'knowledge' CHECK (document_type IN ('knowledge', 'permit', 'contract'));

-- Create index for renewal date queries
CREATE INDEX idx_documents_renewal_date ON public.documents(renewal_date) WHERE renewal_date IS NOT NULL;

-- Create a view for upcoming renewals
CREATE OR REPLACE VIEW public.upcoming_renewals AS
SELECT 
  d.id,
  d.title,
  d.renewal_date,
  d.location_id,
  l.name as location_name,
  dc.name as category_name,
  d.document_type,
  d.file_url,
  d.company_id
FROM public.documents d
LEFT JOIN public.locations l ON d.location_id = l.id
LEFT JOIN public.document_categories dc ON d.category_id = dc.id
WHERE d.renewal_date IS NOT NULL
  AND d.renewal_date >= CURRENT_DATE
ORDER BY d.renewal_date ASC;

-- Grant access to the view
GRANT SELECT ON public.upcoming_renewals TO authenticated;