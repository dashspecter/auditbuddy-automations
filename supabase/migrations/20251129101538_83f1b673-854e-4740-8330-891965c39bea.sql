-- Fix security definer view by removing it and recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.upcoming_renewals;

CREATE VIEW public.upcoming_renewals 
WITH (security_invoker = true) AS
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