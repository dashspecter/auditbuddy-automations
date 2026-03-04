
-- 1. Create SECURITY DEFINER function for atomic deep-merge upsert
CREATE OR REPLACE FUNCTION public.upsert_form_submission(
  p_location_form_template_id UUID,
  p_template_id UUID,
  p_template_version_id UUID,
  p_company_id UUID,
  p_location_id UUID,
  p_period_year INT,
  p_period_month INT,
  p_new_data JSONB,
  p_submitted_by UUID,
  p_final_submit BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing RECORD;
  v_merged_data JSONB;
  v_existing_grid JSONB;
  v_new_grid JSONB;
  v_merged_grid JSONB;
  v_day TEXT;
  v_time TEXT;
  v_result_id UUID;
  v_status TEXT;
BEGIN
  -- 1. Fetch existing row (bypasses RLS via SECURITY DEFINER)
  SELECT id, data, status INTO v_existing
  FROM form_submissions
  WHERE location_form_template_id = p_location_form_template_id
    AND period_year = p_period_year
    AND period_month = p_period_month
  LIMIT 1;

  -- 2. Deep-merge grid data at day -> time -> field granularity
  v_new_grid := COALESCE(p_new_data->'grid', '{}'::jsonb);
  
  IF v_existing.id IS NOT NULL THEN
    v_existing_grid := COALESCE(v_existing.data->'grid', '{}'::jsonb);
    
    -- Start with existing grid
    v_merged_grid := v_existing_grid;
    
    -- Merge each day from new data
    FOR v_day IN SELECT jsonb_object_keys(v_new_grid) LOOP
      IF v_merged_grid ? v_day THEN
        -- Day exists: merge time slots
        FOR v_time IN SELECT jsonb_object_keys(v_new_grid->v_day) LOOP
          IF v_merged_grid->v_day ? v_time THEN
            -- Time slot exists: merge fields (new overwrites existing per-field)
            v_merged_grid := jsonb_set(
              v_merged_grid,
              ARRAY[v_day, v_time],
              (v_merged_grid->v_day->v_time) || (v_new_grid->v_day->v_time)
            );
          ELSE
            -- New time slot
            v_merged_grid := jsonb_set(
              v_merged_grid,
              ARRAY[v_day, v_time],
              v_new_grid->v_day->v_time
            );
          END IF;
        END LOOP;
      ELSE
        -- New day entirely
        v_merged_grid := jsonb_set(v_merged_grid, ARRAY[v_day], v_new_grid->v_day);
      END IF;
    END LOOP;
    
    -- Preserve non-grid keys from existing data, overlay with merged grid
    v_merged_data := COALESCE(v_existing.data, '{}'::jsonb);
    v_merged_data := jsonb_set(v_merged_data, '{grid}', v_merged_grid);
    -- Also preserve any non-grid keys from new data (e.g. rows)
    IF p_new_data ? 'rows' THEN
      v_merged_data := jsonb_set(v_merged_data, '{rows}', p_new_data->'rows');
    END IF;
    
    v_status := CASE WHEN p_final_submit THEN 'submitted' ELSE COALESCE(v_existing.status, 'draft') END;
    
    -- Don't overwrite if locked
    IF v_existing.status = 'locked' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'FORM_LOCKED',
        'submission_id', v_existing.id
      );
    END IF;
    
    -- Update existing
    UPDATE form_submissions
    SET data = v_merged_data,
        status = v_status,
        submitted_at = CASE WHEN p_final_submit THEN now() ELSE submitted_at END,
        updated_at = now()
    WHERE id = v_existing.id;
    
    v_result_id := v_existing.id;
  ELSE
    -- No existing row: insert with new data as-is
    v_status := CASE WHEN p_final_submit THEN 'submitted' ELSE 'draft' END;
    
    INSERT INTO form_submissions (
      company_id, location_id, location_form_template_id,
      template_id, template_version_id,
      period_year, period_month,
      status, submitted_by, submitted_at, data
    ) VALUES (
      p_company_id, p_location_id, p_location_form_template_id,
      p_template_id, p_template_version_id,
      p_period_year, p_period_month,
      v_status, p_submitted_by,
      CASE WHEN p_final_submit THEN now() ELSE NULL END,
      p_new_data
    )
    RETURNING id INTO v_result_id;
  END IF;

  -- 3. Audit log
  INSERT INTO form_submission_audit (submission_id, action, new_value, actor_id)
  VALUES (
    v_result_id,
    CASE WHEN v_existing.id IS NOT NULL THEN
      CASE WHEN p_final_submit THEN 'final_submit' ELSE 'update_cell' END
    ELSE 'create' END,
    p_new_data,
    p_submitted_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_result_id,
    'status', v_status
  );
END;
$$;

-- 2. Fix INSERT RLS policy (self-referential bug)
DROP POLICY IF EXISTS "Staff can create submissions" ON form_submissions;
CREATE POLICY "Staff can create submissions" ON form_submissions FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND company_id IN (
    SELECT cu.company_id FROM company_users cu WHERE cu.user_id = auth.uid()
    UNION
    SELECT e.company_id FROM employees e WHERE e.user_id = auth.uid()
  )
);
