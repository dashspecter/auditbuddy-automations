
-- Monthly score snapshots table
CREATE TABLE public.performance_monthly_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- first day of month
  effective_score NUMERIC,
  used_components INT NOT NULL DEFAULT 0,
  attendance_score NUMERIC,
  punctuality_score NUMERIC,
  task_score NUMERIC,
  test_score NUMERIC,
  review_score NUMERIC,
  warning_penalty NUMERIC DEFAULT 0,
  rank_in_location INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month)
);

-- RLS
ALTER TABLE public.performance_monthly_scores ENABLE ROW LEVEL SECURITY;

-- Employees can read their own scores
CREATE POLICY "Employees can read own monthly scores"
  ON public.performance_monthly_scores
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- Employees can read same-location scores (for leaderboard context)
CREATE POLICY "Employees can read same-location scores"
  ON public.performance_monthly_scores
  FOR SELECT
  USING (
    employee_id IN (
      SELECT e2.id FROM public.employees e1
      JOIN public.employees e2 ON e1.location_id = e2.location_id
      WHERE e1.user_id = auth.uid()
    )
  );

-- Managers can read all scores in their company
CREATE POLICY "Managers can read company monthly scores"
  ON public.performance_monthly_scores
  FOR SELECT
  USING (
    company_id IN (
      SELECT cu.company_id FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_member')
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- Service role insert/update (edge function uses service role)
CREATE POLICY "Service role can manage monthly scores"
  ON public.performance_monthly_scores
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_perf_monthly_employee_month ON public.performance_monthly_scores(employee_id, month DESC);
CREATE INDEX idx_perf_monthly_company_month ON public.performance_monthly_scores(company_id, month);
