
-- ============================================================
-- Phase 3a: Denormalize section scores onto location_audits
-- Adds a JSONB column caching pre-computed section scores
-- and a trigger to keep it in sync when field responses change.
-- ============================================================

-- 1) Add cached column (NULL default = safe, no existing row breakage)
ALTER TABLE public.location_audits
  ADD COLUMN IF NOT EXISTS cached_section_scores JSONB DEFAULT NULL;

-- 2) Function to recompute & cache section scores for a given audit
CREATE OR REPLACE FUNCTION public.recompute_audit_section_scores(p_audit_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_object_agg(section_key, section_obj)
  INTO v_result
  FROM (
    SELECT
      afr.section_id::text AS section_key,
      jsonb_build_object(
        'section_id', afr.section_id,
        'section_name', COALESCE(asec.name, 'Unknown'),
        'field_count', COUNT(*)::int,
        'scored_fields', COUNT(*) FILTER (
          WHERE af.field_type IN ('rating','yes_no','yesno','checkbox','binary')
        )::int,
        'total_score', COALESCE(
          ROUND(
            AVG(
              CASE
                WHEN af.field_type = 'rating' THEN (afr.response_value::text)::numeric
                WHEN af.field_type IN ('yes_no','yesno','checkbox','binary') THEN
                  CASE WHEN lower(afr.response_value::text) IN ('"yes"','yes','true','"true"','1') THEN 100 ELSE 0 END
                ELSE NULL
              END
            )
          , 0), 0)::int
      ) AS section_obj
    FROM audit_field_responses afr
    JOIN audit_fields af ON af.id = afr.field_id
    LEFT JOIN audit_sections asec ON asec.id = afr.section_id
    WHERE afr.audit_id = p_audit_id
    GROUP BY afr.section_id, asec.name
  ) sub;

  UPDATE location_audits
  SET cached_section_scores = COALESCE(v_result, '{}'::jsonb)
  WHERE id = p_audit_id;
END;
$$;

-- 3) Trigger function: auto-update cache when field responses change
CREATE OR REPLACE FUNCTION public.trg_sync_section_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_audit_section_scores(OLD.audit_id);
    RETURN OLD;
  ELSE
    PERFORM recompute_audit_section_scores(NEW.audit_id);
    RETURN NEW;
  END IF;
END;
$$;

-- 4) Attach trigger to audit_field_responses
DROP TRIGGER IF EXISTS trg_section_scores_sync ON public.audit_field_responses;
CREATE TRIGGER trg_section_scores_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.audit_field_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_section_scores();

-- 5) Index for fast JSONB lookups
CREATE INDEX IF NOT EXISTS idx_location_audits_cached_scores
  ON public.location_audits USING gin (cached_section_scores)
  WHERE cached_section_scores IS NOT NULL;

-- 6) Backfill existing audits (run once)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT audit_id FROM audit_field_responses LOOP
    PERFORM recompute_audit_section_scores(r.audit_id);
  END LOOP;
END;
$$;
