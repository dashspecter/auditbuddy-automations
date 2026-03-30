
-- Create child table for individual time-off dates
CREATE TABLE public.time_off_request_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.time_off_requests(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, date)
);

-- Add company_id for RLS
ALTER TABLE public.time_off_request_dates ADD COLUMN company_id UUID NOT NULL REFERENCES public.companies(id);

-- RLS
ALTER TABLE public.time_off_request_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company time off dates"
  ON public.time_off_request_dates
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company time off dates"
  ON public.time_off_request_dates
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company time off dates"
  ON public.time_off_request_dates
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company time off dates"
  ON public.time_off_request_dates
  FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Index for efficient lookups
CREATE INDEX idx_time_off_request_dates_request_id ON public.time_off_request_dates(request_id);
CREATE INDEX idx_time_off_request_dates_date ON public.time_off_request_dates(date);
CREATE INDEX idx_time_off_request_dates_company_id ON public.time_off_request_dates(company_id);

-- Backfill existing approved requests: expand start_date→end_date into individual date rows
INSERT INTO public.time_off_request_dates (request_id, date, company_id)
SELECT 
  r.id,
  d::date,
  r.company_id
FROM public.time_off_requests r
CROSS JOIN LATERAL generate_series(r.start_date::date, r.end_date::date, interval '1 day') AS d
WHERE r.status = 'approved';
