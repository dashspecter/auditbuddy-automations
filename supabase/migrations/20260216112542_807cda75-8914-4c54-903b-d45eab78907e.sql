
-- Phase 2: Materialized Views for KPI Dashboards
-- These are read-only pre-computed aggregates that speed up dashboard loading

-- 1. Audit stats aggregated by company + location
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_audit_stats_by_location AS
SELECT
  la.company_id,
  la.location_id,
  l.name AS location_name,
  COUNT(*) AS total_audits,
  COUNT(*) FILTER (WHERE la.status = 'compliant') AS completed_audits,
  COUNT(*) FILTER (WHERE la.status IN ('pending', 'draft') AND la.audit_date < CURRENT_DATE) AS overdue_audits,
  ROUND(AVG(la.overall_score) FILTER (WHERE la.overall_score > 0))::int AS avg_score,
  MIN(la.overall_score) FILTER (WHERE la.overall_score > 0) AS min_score,
  MAX(la.overall_score) FILTER (WHERE la.overall_score > 0) AS max_score,
  COUNT(*) FILTER (WHERE la.overall_score > 0) AS scored_audit_count,
  MAX(la.audit_date) AS latest_audit_date
FROM public.location_audits la
LEFT JOIN public.locations l ON l.id = la.location_id
GROUP BY la.company_id, la.location_id, l.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_audit_stats_company_location
  ON public.mv_audit_stats_by_location (company_id, location_id);

-- 2. Section-level scores aggregated per audit (pre-computed from field responses)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_audit_section_scores AS
SELECT
  la.company_id,
  la.id AS audit_id,
  la.location_id,
  la.audit_date,
  la.template_id,
  afr.section_id,
  asec.name AS section_name,
  -- Calculate section score using rating and binary fields
  CASE 
    WHEN SUM(
      CASE 
        WHEN af.field_type = 'rating' THEN COALESCE((af.options->>'max')::int, 5)
        WHEN af.field_type IN ('yes_no', 'yesno', 'checkbox') THEN 1
        ELSE 0
      END
    ) = 0 THEN 0
    ELSE ROUND(
      (SUM(
        CASE 
          WHEN af.field_type = 'rating' THEN COALESCE((afr.response_value)::text::numeric, 0)
          WHEN af.field_type IN ('yes_no', 'yesno', 'checkbox') 
            AND (afr.response_value)::text IN ('"yes"', '"Yes"', '"true"', '"TRUE"', '"True"', 'true')
            THEN 1
          ELSE 0
        END
      )::numeric / NULLIF(SUM(
        CASE 
          WHEN af.field_type = 'rating' THEN COALESCE((af.options->>'max')::int, 5)
          WHEN af.field_type IN ('yes_no', 'yesno', 'checkbox') THEN 1
          ELSE 0
        END
      ), 0)) * 100
    )::int
  END AS section_score,
  COUNT(*) AS field_count
FROM public.audit_field_responses afr
JOIN public.audit_fields af ON af.id = afr.field_id
JOIN public.audit_sections asec ON asec.id = afr.section_id
JOIN public.location_audits la ON la.id = afr.audit_id
WHERE af.field_type IN ('rating', 'yes_no', 'yesno', 'checkbox')
GROUP BY la.company_id, la.id, la.location_id, la.audit_date, la.template_id, afr.section_id, asec.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_section_scores_audit_section
  ON public.mv_audit_section_scores (audit_id, section_id);
CREATE INDEX IF NOT EXISTS idx_mv_section_scores_company_location
  ON public.mv_audit_section_scores (company_id, location_id, audit_date DESC);

-- 3. Daily attendance stats per location
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_attendance_daily_stats AS
SELECT
  s.company_id,
  s.location_id,
  l.name AS location_name,
  s.shift_date,
  COUNT(DISTINCT sa.staff_id) AS staff_scheduled,
  COUNT(DISTINCT al.staff_id) AS staff_checked_in,
  COUNT(DISTINCT al.staff_id) FILTER (WHERE al.is_late = true) AS late_count,
  COALESCE(SUM(al.late_minutes) FILTER (WHERE al.is_late = true), 0)::int AS total_late_minutes,
  COUNT(DISTINCT al.staff_id) FILTER (WHERE al.auto_clocked_out = true) AS auto_clockout_count
FROM public.shifts s
JOIN public.shift_assignments sa ON sa.shift_id = s.id AND sa.approval_status = 'approved'
LEFT JOIN public.locations l ON l.id = s.location_id
LEFT JOIN public.attendance_logs al ON al.shift_id = s.id AND al.staff_id = sa.staff_id
WHERE s.shift_date <= CURRENT_DATE
GROUP BY s.company_id, s.location_id, l.name, s.shift_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_attendance_company_location_date
  ON public.mv_attendance_daily_stats (company_id, location_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_mv_attendance_date
  ON public.mv_attendance_daily_stats (shift_date DESC);

-- 4. Task completion stats per location per day
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_task_completion_stats AS
SELECT
  t.company_id,
  t.location_id,
  l.name AS location_name,
  tc.occurrence_date,
  COUNT(DISTINCT tc.task_id) AS tasks_with_completions,
  COUNT(tc.id) AS total_completions,
  COUNT(tc.id) FILTER (WHERE tc.completed_late = false OR tc.completed_late IS NULL) AS on_time_completions,
  COUNT(tc.id) FILTER (WHERE tc.completed_late = true) AS late_completions
FROM public.task_completions tc
JOIN public.tasks t ON t.id = tc.task_id
LEFT JOIN public.locations l ON l.id = t.location_id
WHERE tc.occurrence_date IS NOT NULL
GROUP BY t.company_id, t.location_id, l.name, tc.occurrence_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_task_stats_company_location_date
  ON public.mv_task_completion_stats (company_id, location_id, occurrence_date);

-- 5. Function to refresh all materialized views (called by cron/edge function)
CREATE OR REPLACE FUNCTION public.refresh_dashboard_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_audit_stats_by_location;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_audit_section_scores;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_attendance_daily_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_task_completion_stats;
END;
$$;
