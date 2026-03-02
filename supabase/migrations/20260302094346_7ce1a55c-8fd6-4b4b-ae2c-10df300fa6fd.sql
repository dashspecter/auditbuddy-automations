CREATE OR REPLACE FUNCTION public.calculate_location_performance_scores(
  p_company_id UUID,
  p_location_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  employee_role TEXT,
  attendance_score NUMERIC,
  punctuality_score NUMERIC,
  task_score NUMERIC,
  test_score NUMERIC,
  review_score NUMERIC,
  warning_penalty NUMERIC,
  effective_score NUMERIC,
  used_components INT,
  shifts_scheduled INT,
  shifts_worked INT,
  tasks_assigned INT,
  tasks_completed_on_time INT,
  late_count INT,
  total_late_minutes INT,
  rank_in_location INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_emp RECORD;
  v_shifts_scheduled INT;
  v_shifts_worked INT;
  v_late_count INT;
  v_total_late_minutes INT;
  v_tasks_assigned INT;
  v_tasks_on_time INT;
  v_test_avg NUMERIC;
  v_review_avg NUMERIC;
  v_warning_penalty NUMERIC;
  v_attendance_score NUMERIC;
  v_punctuality_score NUMERIC;
  v_task_score NUMERIC;
  v_test_score NUMERIC;
  v_review_score NUMERIC;
  v_effective_score NUMERIC;
  v_used_count INT;
  v_used_sum NUMERIC;
  v_attendance_used BOOLEAN;
  v_punctuality_used BOOLEAN;
  v_task_used BOOLEAN;
  v_test_used BOOLEAN;
  v_review_used BOOLEAN;
  v_late_deduction NUMERIC;
  v_late_min_deduction NUMERIC;
  v_emp_normalized_role TEXT;
  -- Direct task vars
  v_direct_assigned INT;
  v_direct_on_time INT;
  -- Shared task vars
  v_shared_assigned INT;
  v_shared_on_time INT;
  -- Individual task vars
  v_individual_assigned INT;
  v_individual_on_time INT;
  -- Result storage for ranking
  v_results UUID[];
  v_scores NUMERIC[];
  v_rank INT;
BEGIN
  -- Loop through employees at this location (home + guest via approved shifts)
  FOR v_emp IN
    SELECT DISTINCT e.id, e.full_name, e.role
    FROM employees e
    LEFT JOIN shift_assignments sa ON sa.staff_id = e.id AND sa.approval_status = 'approved'
    LEFT JOIN shifts s ON s.id = sa.shift_id AND s.shift_date BETWEEN p_start_date AND p_end_date
    WHERE e.company_id = p_company_id
      AND e.status = 'active'
      AND (e.location_id = p_location_id OR s.location_id = p_location_id)
  LOOP
    -- Normalize employee role for matching
    v_emp_normalized_role := lower(trim(translate(COALESCE(v_emp.role, ''), 'ăâîșțĂÂÎȘȚ', 'aaistAAIST')));

    -- ========== ATTENDANCE ==========
    SELECT COUNT(*) INTO v_shifts_scheduled
    FROM shifts sh
    INNER JOIN shift_assignments sa2 ON sa2.shift_id = sh.id
    WHERE sa2.staff_id = v_emp.id
      AND sa2.approval_status = 'approved'
      AND sh.shift_date BETWEEN p_start_date AND p_end_date
      AND sh.location_id = p_location_id
      AND sh.shift_date <= CURRENT_DATE;

    SELECT COUNT(DISTINCT al.shift_id) INTO v_shifts_worked
    FROM attendance_logs al
    INNER JOIN shifts sh ON sh.id = al.shift_id
    WHERE al.staff_id = v_emp.id
      AND sh.shift_date BETWEEN p_start_date AND p_end_date
      AND sh.location_id = p_location_id;

    v_attendance_used := v_shifts_scheduled > 0;
    v_attendance_score := CASE WHEN v_shifts_scheduled > 0 
      THEN ROUND((v_shifts_worked::NUMERIC / v_shifts_scheduled) * 100, 1) 
      ELSE 0 END;

    -- ========== PUNCTUALITY ==========
    SELECT COUNT(*), COALESCE(SUM(al.late_minutes), 0)
    INTO v_late_count, v_total_late_minutes
    FROM attendance_logs al
    INNER JOIN shifts sh ON sh.id = al.shift_id
    WHERE al.staff_id = v_emp.id
      AND al.is_late = true
      AND sh.shift_date BETWEEN p_start_date AND p_end_date
      AND sh.location_id = p_location_id;

    -- FIX: Punctuality only used if employee actually worked shifts
    v_punctuality_used := v_shifts_worked > 0;
    v_late_deduction := LEAST(v_late_count * 5, 100);
    v_late_min_deduction := LEAST(FLOOR(v_total_late_minutes::NUMERIC / 10), 50);
    v_punctuality_score := GREATEST(0, 100 - v_late_deduction - v_late_min_deduction);
    IF v_punctuality_used THEN
      NULL; -- score already computed
    ELSE
      v_punctuality_score := 0;
    END IF;

    -- ========== TASKS ==========
    -- Build shift dates set for this employee at this location
    -- Direct tasks (assigned_to = employee)
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE t.status = 'completed' AND COALESCE(t.completed_late, false) = false)
    INTO v_direct_assigned, v_direct_on_time
    FROM tasks t
    WHERE t.assigned_to = v_emp.id
      AND t.created_at >= (p_start_date || ' 00:00:00')::timestamptz
      AND t.created_at <= (p_end_date || ' 23:59:59')::timestamptz;

    -- Shared tasks (non-individual, unassigned) — assigned count with role filter
    SELECT COUNT(*) INTO v_shared_assigned
    FROM tasks t
    WHERE t.assigned_to IS NULL
      AND COALESCE(t.is_individual, false) = false
      AND t.created_at >= (p_start_date || ' 00:00:00')::timestamptz
      AND t.created_at <= (p_end_date || ' 23:59:59')::timestamptz
      AND EXISTS (
        SELECT 1 FROM task_locations tl WHERE tl.task_id = t.id AND tl.location_id = p_location_id
      )
      AND (
        (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr WHERE tr.task_id = t.id))
        OR EXISTS (
          SELECT 1 FROM employee_roles er
          WHERE er.id = t.assigned_role_id
            AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistAAIST'))) = v_emp_normalized_role
        )
        OR EXISTS (
          SELECT 1 FROM task_roles tr
          JOIN employee_roles er ON er.id = tr.role_id
          WHERE tr.task_id = t.id
            AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistAAIST'))) = v_emp_normalized_role
        )
      );

    -- Shared tasks — on-time completions with role filter AND shift-day filter
    SELECT COUNT(*) INTO v_shared_on_time
    FROM task_completions tc
    INNER JOIN tasks t ON t.id = tc.task_id
    WHERE tc.completed_by_employee_id = v_emp.id
      AND t.assigned_to IS NULL
      AND COALESCE(t.is_individual, false) = false
      AND tc.occurrence_date BETWEEN p_start_date AND p_end_date
      AND COALESCE(tc.completed_late, false) = false
      AND EXISTS (
        SELECT 1 FROM task_locations tl WHERE tl.task_id = t.id AND tl.location_id = p_location_id
      )
      AND (
        (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr WHERE tr.task_id = t.id))
        OR EXISTS (
          SELECT 1 FROM employee_roles er
          WHERE er.id = t.assigned_role_id
            AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistAAIST'))) = v_emp_normalized_role
        )
        OR EXISTS (
          SELECT 1 FROM task_roles tr
          JOIN employee_roles er ON er.id = tr.role_id
          WHERE tr.task_id = t.id
            AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistAAIST'))) = v_emp_normalized_role
        )
      )
      AND tc.occurrence_date IN (
        SELECT sh.shift_date FROM shifts sh
        INNER JOIN shift_assignments sa3 ON sa3.shift_id = sh.id
        WHERE sa3.staff_id = v_emp.id
          AND sa3.approval_status = 'approved'
          AND sh.location_id = p_location_id
          AND sh.shift_date BETWEEN p_start_date AND p_end_date
      );

    -- Individual tasks — assigned count with role filter
    SELECT COUNT(DISTINCT t.id || '-' || tc.occurrence_date) INTO v_individual_assigned
    FROM tasks t
    INNER JOIN task_completions tc ON tc.task_id = t.id
    WHERE t.assigned_to IS NULL
      AND t.is_individual = true
      AND tc.occurrence_date BETWEEN p_start_date AND p_end_date
      AND tc.completed_by_employee_id = v_emp.id
      AND EXISTS (
        SELECT 1 FROM task_locations tl WHERE tl.task_id = t.id AND tl.location_id = p_location_id
      )
      AND (
        (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr WHERE tr.task_id = t.id))
        OR EXISTS (
          SELECT 1 FROM employee_roles er
          WHERE er.id = t.assigned_role_id
            AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistAAIST'))) = v_emp_normalized_role
        )
        OR EXISTS (
          SELECT 1 FROM task_roles tr
          JOIN employee_roles er ON er.id = tr.role_id
          WHERE tr.task_id = t.id
            AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistAAIST'))) = v_emp_normalized_role
        )
      )
      AND tc.occurrence_date IN (
        SELECT sh.shift_date FROM shifts sh
        INNER JOIN shift_assignments sa3 ON sa3.shift_id = sh.id
        WHERE sa3.staff_id = v_emp.id
          AND sa3.approval_status = 'approved'
          AND sh.location_id = p_location_id
          AND sh.shift_date BETWEEN p_start_date AND p_end_date
      );

    -- Individual tasks — on-time completions with role filter AND shift-day filter
    SELECT COUNT(*) INTO v_individual_on_time
    FROM task_completions tc
    INNER JOIN tasks t ON t.id = tc.task_id
    WHERE tc.completed_by_employee_id = v_emp.id
      AND t.assigned_to IS NULL
      AND t.is_individual = true
      AND tc.occurrence_date BETWEEN p_start_date AND p_end_date
      AND COALESCE(tc.completed_late, false) = false
      AND EXISTS (
        SELECT 1 FROM task_locations tl WHERE tl.task_id = t.id AND tl.location_id = p_location_id
      )
      AND (
        (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr WHERE tr.task_id = t.id))
        OR EXISTS (
          SELECT 1 FROM employee_roles er
          WHERE er.id = t.assigned_role_id
            AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistAAIST'))) = v_emp_normalized_role
        )
        OR EXISTS (
          SELECT 1 FROM task_roles tr
          JOIN employee_roles er ON er.id = tr.role_id
          WHERE tr.task_id = t.id
            AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistAAIST'))) = v_emp_normalized_role
        )
      )
      AND tc.occurrence_date IN (
        SELECT sh.shift_date FROM shifts sh
        INNER JOIN shift_assignments sa3 ON sa3.shift_id = sh.id
        WHERE sa3.staff_id = v_emp.id
          AND sa3.approval_status = 'approved'
          AND sh.location_id = p_location_id
          AND sh.shift_date BETWEEN p_start_date AND p_end_date
      );

    -- Merge task totals
    v_tasks_assigned := v_direct_assigned + v_shared_assigned + v_individual_assigned;
    v_tasks_on_time := v_direct_on_time + v_shared_on_time + v_individual_on_time;

    v_task_used := v_tasks_assigned > 0;
    v_task_score := CASE WHEN v_tasks_assigned > 0 
      THEN LEAST(100, ROUND((v_tasks_on_time::NUMERIC / v_tasks_assigned) * 100, 1))
      ELSE 0 END;

    -- ========== TESTS ==========
    SELECT AVG(ts.score) INTO v_test_avg
    FROM test_submissions ts
    WHERE ts.employee_id = v_emp.id
      AND ts.completed_at >= (p_start_date || ' 00:00:00')::timestamptz
      AND ts.completed_at <= (p_end_date || ' 23:59:59')::timestamptz;

    v_test_used := v_test_avg IS NOT NULL;
    v_test_score := COALESCE(v_test_avg, 0);

    -- ========== REVIEWS ==========
    SELECT AVG(sa.score) INTO v_review_avg
    FROM staff_audits sa
    WHERE sa.employee_id = v_emp.id
      AND sa.audit_date BETWEEN p_start_date AND p_end_date;

    v_review_used := v_review_avg IS NOT NULL;
    v_review_score := COALESCE(v_review_avg, 0);

    -- ========== WARNINGS ==========
    SELECT COALESCE(SUM(
      CASE 
        WHEN (se.metadata->>'severity') = 'major' THEN 10 * GREATEST(0, 1 - EXTRACT(DAY FROM (p_end_date - se.event_date::date))::NUMERIC / 90)
        ELSE 5 * GREATEST(0, 1 - EXTRACT(DAY FROM (p_end_date - se.event_date::date))::NUMERIC / 90)
      END
    ), 0) INTO v_warning_penalty
    FROM staff_events se
    WHERE se.staff_id = v_emp.id
      AND se.event_type = 'warning'
      AND se.event_date >= (p_end_date - INTERVAL '90 days')::date;

    -- ========== EFFECTIVE SCORE ==========
    v_used_count := 0;
    v_used_sum := 0;

    IF v_attendance_used THEN
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_attendance_score;
    END IF;
    IF v_punctuality_used THEN
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_punctuality_score;
    END IF;
    IF v_task_used THEN
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_task_score;
    END IF;
    IF v_test_used THEN
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_test_score;
    END IF;
    IF v_review_used THEN
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_review_score;
    END IF;

    IF v_used_count > 0 THEN
      v_effective_score := GREATEST(0, LEAST(100, ROUND(v_used_sum / v_used_count, 1) - v_warning_penalty));
    ELSE
      v_effective_score := NULL;
    END IF;

    -- Store for ranking
    v_results := array_append(v_results, v_emp.id);
    v_scores := array_append(v_scores, COALESCE(v_effective_score, -1));

    employee_id := v_emp.id;
    employee_name := v_emp.full_name;
    employee_role := v_emp.role;
    attendance_score := v_attendance_score;
    punctuality_score := v_punctuality_score;
    task_score := v_task_score;
    test_score := v_test_score;
    review_score := v_review_score;
    warning_penalty := v_warning_penalty;
    effective_score := v_effective_score;
    used_components := v_used_count;
    shifts_scheduled := v_shifts_scheduled;
    shifts_worked := v_shifts_worked;
    tasks_assigned := v_tasks_assigned;
    tasks_completed_on_time := v_tasks_on_time;
    late_count := v_late_count;
    total_late_minutes := v_total_late_minutes;
    rank_in_location := 0; -- placeholder

    RETURN NEXT;
  END LOOP;
END;
$$;