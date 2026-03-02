DO $$
DECLARE
  rec RECORD;
  merged_grid JSONB;
  sub RECORD;
  day_key TEXT;
  time_key TEXT;
BEGIN
  FOR rec IN
    SELECT location_form_template_id, period_year, period_month
    FROM form_submissions
    WHERE period_year IS NOT NULL AND period_month IS NOT NULL
    GROUP BY location_form_template_id, period_year, period_month
    HAVING COUNT(*) > 1
  LOOP
    merged_grid := '{}'::JSONB;
    
    FOR sub IN
      SELECT id, data
      FROM form_submissions
      WHERE location_form_template_id = rec.location_form_template_id
        AND period_year = rec.period_year
        AND period_month = rec.period_month
      ORDER BY created_at ASC
    LOOP
      IF sub.data IS NOT NULL AND (sub.data->>'grid') IS NOT NULL THEN
        FOR day_key IN SELECT jsonb_object_keys(sub.data->'grid')
        LOOP
          IF merged_grid->day_key IS NULL THEN
            merged_grid := jsonb_set(merged_grid, ARRAY[day_key], sub.data->'grid'->day_key);
          ELSE
            FOR time_key IN SELECT jsonb_object_keys(sub.data->'grid'->day_key)
            LOOP
              IF merged_grid->day_key->time_key IS NULL THEN
                merged_grid := jsonb_set(merged_grid, ARRAY[day_key, time_key], sub.data->'grid'->day_key->time_key);
              ELSE
                merged_grid := jsonb_set(
                  merged_grid, 
                  ARRAY[day_key, time_key], 
                  (merged_grid->day_key->time_key) || (sub.data->'grid'->day_key->time_key)
                );
              END IF;
            END LOOP;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    
    UPDATE form_submissions
    SET data = jsonb_build_object('grid', merged_grid),
        updated_at = NOW()
    WHERE id = (
      SELECT id FROM form_submissions
      WHERE location_form_template_id = rec.location_form_template_id
        AND period_year = rec.period_year
        AND period_month = rec.period_month
      ORDER BY created_at ASC
      LIMIT 1
    )
    AND merged_grid != '{}'::JSONB;
    
    DELETE FROM form_submissions
    WHERE location_form_template_id = rec.location_form_template_id
      AND period_year = rec.period_year
      AND period_month = rec.period_month
      AND id != (
        SELECT id FROM form_submissions
        WHERE location_form_template_id = rec.location_form_template_id
          AND period_year = rec.period_year
          AND period_month = rec.period_month
        ORDER BY created_at ASC
        LIMIT 1
      );
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_form_submissions_unique_period 
ON form_submissions (location_form_template_id, period_year, period_month) 
WHERE period_year IS NOT NULL AND period_month IS NOT NULL;