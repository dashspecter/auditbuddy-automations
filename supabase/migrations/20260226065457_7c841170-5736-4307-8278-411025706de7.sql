
-- P1: Add storage UPDATE policy for waste-photos bucket
CREATE POLICY "Users can update waste photos in their company folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'waste-photos'
  AND (storage.foldername(name))[1] = 'company'
  AND (storage.foldername(name))[2] = (public.get_user_company_id(auth.uid()))::text
);

-- P1: Backfill NULL waste_reason_ids with first reason per company
UPDATE public.waste_entries we
SET waste_reason_id = (
  SELECT id FROM public.waste_reasons wr
  WHERE wr.company_id = we.company_id
  ORDER BY wr.sort_order ASC
  LIMIT 1
)
WHERE we.waste_reason_id IS NULL;

-- P1: Add NOT NULL constraint on waste_reason_id
ALTER TABLE public.waste_entries ALTER COLUMN waste_reason_id SET NOT NULL;

-- P2: Update RLS policies for waste_products to include managers
DROP POLICY IF EXISTS "Company admins can manage waste products" ON public.waste_products;
CREATE POLICY "Company admins and managers can manage waste products"
ON public.waste_products FOR ALL
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.user_is_manager_in_company(auth.uid(), company_id)
  )
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.user_is_manager_in_company(auth.uid(), company_id)
  )
);

-- P2: Update RLS policies for waste_reasons to include managers
DROP POLICY IF EXISTS "Company admins can manage waste reasons" ON public.waste_reasons;
CREATE POLICY "Company admins and managers can manage waste reasons"
ON public.waste_reasons FOR ALL
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.user_is_manager_in_company(auth.uid(), company_id)
  )
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.user_is_manager_in_company(auth.uid(), company_id)
  )
);

-- P2: Update RLS policies for waste_thresholds to include managers
DROP POLICY IF EXISTS "Company admins can manage waste thresholds" ON public.waste_thresholds;
CREATE POLICY "Company admins and managers can manage waste thresholds"
ON public.waste_thresholds FOR ALL
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.user_is_manager_in_company(auth.uid(), company_id)
  )
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.user_is_manager_in_company(auth.uid(), company_id)
  )
);
