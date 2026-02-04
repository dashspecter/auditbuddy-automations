-- Secure kiosk task read API (anonymous kiosk access)
-- Provides the same task set to Kiosk that staff/mobile see for the location,
-- including completed templates and global role-based tasks.

CREATE OR REPLACE FUNCTION public.get_kiosk_tasks(
  p_token text,
  p_location_id uuid,
  p_company_id uuid
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  location_id uuid,
  title text,
  description text,
  created_by uuid,
  assigned_to uuid,
  assigned_role_id uuid,
  due_at timestamptz,
  start_at timestamptz,
  duration_minutes integer,
  completed_at timestamptz,
  completed_by uuid,
  completed_late boolean,
  status text,
  priority text,
  source text,
  source_reference_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  recurrence_type text,
  recurrence_interval integer,
  recurrence_end_date timestamptz,
  recurrence_days_of_week integer[],
  recurrence_days_of_month integer[],
  parent_task_id uuid,
  is_recurring_instance boolean,
  is_individual boolean,
  execution_mode text,
  lock_mode text,
  unlock_before_minutes integer,
  allow_early_completion boolean,
  early_requires_reason boolean,
  early_requires_photo boolean,
  completion_mode text,
  completion_reason text,
  completion_photo_url text,
  overridden_by uuid,
  overridden_reason text,
  location jsonb,
  assigned_role jsonb,
  role_ids uuid[],
  role_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_ids uuid[];
BEGIN
  -- Validate kiosk token/slug against an active kiosk for this location
  IF NOT EXISTS (
    SELECT 1
    FROM public.attendance_kiosks k
    WHERE k.is_active = true
      AND k.location_id = p_location_id
      AND (
        k.device_token = p_token
        OR k.custom_slug = p_token
      )
  ) THEN
    RETURN; -- empty
  END IF;

  -- Collect task IDs relevant to this kiosk/location
  -- Sources:
  -- 1) tasks.location_id = location
  -- 2) task_locations junction
  -- 3) global role tasks (location_id null) whose role exists at this location
  -- 4) tasks directly assigned to employees at this location
  SELECT array_agg(DISTINCT x.task_id)
  INTO v_task_ids
  FROM (
    -- direct location
    SELECT t.id AS task_id
    FROM public.tasks t
    WHERE t.company_id = p_company_id
      AND t.location_id = p_location_id

    UNION

    -- junction location
    SELECT tl.task_id
    FROM public.task_locations tl
    JOIN public.tasks t ON t.id = tl.task_id
    WHERE tl.location_id = p_location_id
      AND t.company_id = p_company_id

    UNION

    -- global role tasks (no location, role-based)
    SELECT t.id AS task_id
    FROM public.tasks t
    WHERE t.company_id = p_company_id
      AND t.location_id IS NULL
      AND t.assigned_to IS NULL
      AND t.assigned_role_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.employees e
        JOIN public.employee_roles er
          ON er.company_id = p_company_id
         AND lower(trim(er.name)) = lower(trim(e.role))
        WHERE e.location_id = p_location_id
          AND e.status = 'active'
          AND er.id = t.assigned_role_id
      )

    UNION

    -- direct assignments to employees at this location
    SELECT t.id AS task_id
    FROM public.tasks t
    WHERE t.company_id = p_company_id
      AND t.assigned_to IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e.id = t.assigned_to
          AND e.location_id = p_location_id
          AND e.status = 'active'
      )
  ) x;

  IF v_task_ids IS NULL OR array_length(v_task_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.company_id,
    t.location_id,
    t.title,
    t.description,
    t.created_by,
    t.assigned_to,
    t.assigned_role_id,
    t.due_at,
    t.start_at,
    t.duration_minutes,
    t.completed_at,
    t.completed_by,
    t.completed_late,
    t.status,
    t.priority,
    t.source,
    t.source_reference_id,
    t.created_at,
    t.updated_at,
    t.recurrence_type,
    t.recurrence_interval,
    t.recurrence_end_date,
    t.recurrence_days_of_week,
    t.recurrence_days_of_month,
    t.parent_task_id,
    t.is_recurring_instance,
    t.is_individual,
    t.execution_mode,
    t.lock_mode,
    t.unlock_before_minutes,
    t.allow_early_completion,
    t.early_requires_reason,
    t.early_requires_photo,
    t.completion_mode,
    t.completion_reason,
    t.completion_photo_url,
    t.overridden_by,
    t.overridden_reason,
    CASE WHEN l.id IS NULL THEN NULL ELSE jsonb_build_object('id', l.id, 'name', l.name) END AS location,
    CASE WHEN er_primary.id IS NULL THEN NULL ELSE jsonb_build_object('id', er_primary.id, 'name', er_primary.name) END AS assigned_role,
    COALESCE(role_agg.role_ids, '{}'::uuid[]) AS role_ids,
    COALESCE(role_agg.role_names, '{}'::text[]) AS role_names
  FROM public.tasks t
  LEFT JOIN public.locations l ON l.id = t.location_id
  LEFT JOIN public.employee_roles er_primary ON er_primary.id = t.assigned_role_id
  LEFT JOIN LATERAL (
    SELECT
      array_remove(array_agg(DISTINCT er.id), NULL) AS role_ids,
      array_remove(array_agg(DISTINCT er.name), NULL) AS role_names
    FROM (
      SELECT t.assigned_role_id AS role_id
      UNION
      SELECT tr.role_id
      FROM public.task_roles tr
      WHERE tr.task_id = t.id
    ) roles
    LEFT JOIN public.employee_roles er ON er.id = roles.role_id
  ) role_agg ON TRUE
  WHERE t.company_id = p_company_id
    AND t.id = ANY(v_task_ids)
  ORDER BY t.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kiosk_tasks(text, uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_kiosk_tasks(text, uuid, uuid) TO authenticated;
