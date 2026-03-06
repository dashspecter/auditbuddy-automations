-- Fix: normalize rating fields from 1-5 scale to 0-100 scale
CREATE OR REPLACE FUNCTION public.recompute_audit_section_scores(p_audit_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
                WHEN af.field_type = 'rating' THEN ((afr.response_value::text)::numeric / 5.0) * 100
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
$function$;

-- Backfill: recompute all existing cached scores with the new normalization
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM location_audits WHERE cached_section_scores IS NOT NULL AND cached_section_scores != '{}'::jsonb
  LOOP
    PERFORM recompute_audit_section_scores(r.id);
  END LOOP;
END;
$$;