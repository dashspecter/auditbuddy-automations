
CREATE OR REPLACE FUNCTION public.calculate_location_performance_scores(
  p_location_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  role TEXT,
  location_id UUID,
  location_name TEXT,
  avatar_url TEXT,
  attendance_score NUMERIC,
  punctuality_score NUMERIC,
  task_score NUMERIC,
  test_score NUMERIC,
  performance_review_score NUMERIC,
  base_score NUMERIC,
  warning_penalty NUMERIC,
  warning_count INT,
  overall_score NUMERIC,
  shifts_scheduled INT,
  shifts_worked INT,
  shifts_missed INT,
  late_count INT,
  total_late_minutes INT,
  tasks_assigned INT,
  tasks_completed INT,
  tasks_completed_on_time INT,
  tasks_overdue INT,
  tests_taken INT,
  tests_passed INT,
  average_test_score NUMERIC,
  reviews_count INT,
  average_review_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_ninety_days_ago DATE := CURRENT_DATE - 90;
  v_emp RECORD;
  v_loc_name TEXT;
  v_shifts_scheduled INT;
  v_shifts_worked INT;
  v_shifts_missed INT;
  v_late_count INT;
  v_total_late_minutes INT;
  v_direct_assigned INT;
  v_direct_completed INT;
  v_direct_completed_on_time INT;
  v_shared_tasks_assigned INT;
  v_individual_tasks_assigned INT;
  v_individual_tasks_completed INT;
  v_individual_tasks_completed_on_time INT;
  v_completion_count INT;
  v_completion_on_time_count INT;
  v_tasks_assigned INT;
  v_tasks_completed INT;
  v_tasks_completed_on_time INT;
  v_tasks_overdue INT;
  v_tests_taken INT;
  v_tests_passed INT;
  v_avg_test_score NUMERIC;
  v_reviews_count INT;
  v_avg_review_score NUMERIC;
  v_attendance_score NUMERIC;
  v_punctuality_score NUMERIC;
  v_task_score NUMERIC;
  v_test_score NUMERIC;
  v_review_score NUMERIC;
  v_base_score NUMERIC;
  v_warning_penalty NUMERIC;
  v_warning_count INT;
  v_overall_score NUMERIC;
  v_late_deduction NUMERIC;
  v_late_min_deduction NUMERIC;
  v_emp_normalized_role TEXT;
  v_used_count INT;
  v_used_sum NUMERIC;
  v_attendance_used BOOLEAN;
  v_punctuality_used BOOLEAN;
  v_task_used BOOLEAN;
  v_test_used BOOLEAN;
  v_review_used BOOLEAN;
BEGIN
  SELECT l.name INTO v_loc_name FROM locations l WHERE l.id = p_location_id;

  FOR v_emp IN 
    SELECT DISTINCT e.id, e.full_name, e.role, e.location_id, e.avatar_url
    FROM employees e
    WHERE e.status = 'active'
      AND (
        e.location_id = p_location_id
        OR e.id IN (
          SELECT sa.staff_id FROM shift_assignments sa
          JOIN shifts s ON s.id = sa.shift_id
          WHERE s.location_id = p_location_id
            AND s.shift_date >= p_start_date AND s.shift_date <= p_end_date
            AND sa.approval_status = 'approved'
        )
      )
  LOOP
    v_emp_normalized_role := lower(trim(regexp_replace(
      translate(v_emp.role, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'),
      '\s+', ' ', 'g'
    )));

    -- ==================== ATTENDANCE ====================
    SELECT COUNT(*) INTO v_shifts_scheduled
    FROM shifts s
    INNER JOIN shift_assignments sa ON sa.shift_id = s.id
    WHERE sa.staff_id = v_emp.id
      AND s.location_id = p_location_id
      AND s.shift_date >= p_start_date
      AND s.shift_date <= p_end_date
      AND s.shift_date <= v_today
      AND sa.approval_status = 'approved';

    SELECT COUNT(*) INTO v_shifts_worked
    FROM shifts s
    INNER JOIN shift_assignments sa ON sa.shift_id = s.id
    LEFT JOIN locations loc ON loc.id = s.location_id
    WHERE sa.staff_id = v_emp.id
      AND s.location_id = p_location_id
      AND s.shift_date >= p_start_date
      AND s.shift_date <= p_end_date
      AND s.shift_date <= v_today
      AND sa.approval_status = 'approved'
      AND (
        EXISTS (
          SELECT 1 FROM attendance_logs al
          WHERE al.staff_id = v_emp.id AND al.shift_id = s.id
        )
        OR COALESCE(loc.requires_checkin, true) = false
      );

    v_shifts_missed := v_shifts_scheduled - v_shifts_worked;

    -- ==================== PUNCTUALITY ====================
    SELECT COUNT(*), COALESCE(SUM(al.late_minutes), 0)
    INTO v_late_count, v_total_late_minutes
    FROM attendance_logs al
    WHERE al.staff_id = v_emp.id
      AND al.check_in_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND al.check_in_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC')
      AND al.is_late = true;

    -- ==================== DIRECT TASKS ====================
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE t.status = 'completed'),
      COUNT(*) FILTER (WHERE t.status = 'completed' AND COALESCE(t.completed_late, false) = false)
    INTO v_direct_assigned, v_direct_completed, v_direct_completed_on_time
    FROM tasks t
    WHERE t.assigned_to = v_emp.id
      AND t.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND t.created_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC');

    SELECT COUNT(*) INTO v_tasks_overdue
    FROM tasks t
    WHERE t.assigned_to = v_emp.id
      AND t.status != 'completed'
      AND t.due_at IS NOT NULL
      AND t.due_at < now()
      AND t.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND t.created_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC');

    -- ==================== SHARED TASKS (non-individual, non-direct) ====================
    SELECT COALESCE(SUM(occ_count), 0) INTO v_shared_tasks_assigned
    FROM (
      SELECT t.id AS task_id, COUNT(DISTINCT tc_dates.occurrence_date) AS occ_count
      FROM tasks t
      LEFT JOIN task_locations tl ON tl.task_id = t.id
      LEFT JOIN task_roles tr ON tr.task_id = t.id
      LEFT JOIN employee_roles er_direct ON er_direct.id = t.assigned_role_id
      LEFT JOIN employee_roles er_junction ON er_junction.id = tr.role_id
      LEFT JOIN LATERAL (
        SELECT DISTINCT tc.occurrence_date
        FROM task_completions tc
        WHERE tc.task_id = t.id
          AND tc.occurrence_date >= p_start_date
          AND tc.occurrence_date <= p_end_date
        UNION
        SELECT p_start_date AS occurrence_date
        WHERE t.recurrence_type IS NULL
          AND t.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
          AND t.created_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC')
      ) tc_dates ON true
      WHERE t.assigned_to IS NULL
        AND COALESCE(t.is_individual, false) = false
        AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
        AND (
          (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
          OR lower(trim(translate(COALESCE(er_direct.name, er_junction.name, ''), 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role
        )
        AND tc_dates.occurrence_date IN (
          SELECT s.shift_date
          FROM shifts s
          INNER JOIN shift_assignments sa ON sa.shift_id = s.id
          WHERE sa.staff_id = v_emp.id
            AND sa.approval_status = 'approved'
            AND s.shift_date >= p_start_date
            AND s.shift_date <= p_end_date
        )
      GROUP BY t.id
    ) sub;

    -- Shared task completions: NOW with role filter + shift-day filter
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE COALESCE(tc.completed_late, false) = false)
    INTO v_completion_count, v_completion_on_time_count
    FROM task_completions tc
    INNER JOIN tasks t ON t.id = tc.task_id
    LEFT JOIN task_locations tl ON tl.task_id = t.id
    LEFT JOIN task_roles tr ON tr.task_id = t.id
    LEFT JOIN employee_roles er_direct ON er_direct.id = t.assigned_role_id
    LEFT JOIN employee_roles er_junction ON er_junction.id = tr.role_id
    WHERE tc.completed_by_employee_id = v_emp.id
      AND tc.occurrence_date >= p_start_date
      AND tc.occurrence_date <= p_end_date
      AND t.assigned_to IS NULL
      AND COALESCE(t.is_individual, false) = false
      AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
      AND t.id NOT IN (SELECT t2.id FROM tasks t2 WHERE t2.assigned_to = v_emp.id)
      -- Role filter: only count completions for tasks matching employee's role
      AND (
        (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
        OR lower(trim(translate(COALESCE(er_direct.name, er_junction.name, ''), 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role
      )
      -- Shift-day filter: only count completions on days employee was scheduled
      AND tc.occurrence_date IN (
        SELECT s.shift_date
        FROM shifts s
        INNER JOIN shift_assignments sa ON sa.shift_id = s.id
        WHERE sa.staff_id = v_emp.id
          AND sa.approval_status = 'approved'
          AND s.shift_date >= p_start_date
          AND s.shift_date <= p_end_date
      );

    -- ==================== INDIVIDUAL TASKS ====================
    SELECT COALESCE(SUM(occ_count), 0) INTO v_individual_tasks_assigned
    FROM (
      SELECT t.id AS task_id, COUNT(DISTINCT tc_dates.occurrence_date) AS occ_count
      FROM tasks t
      LEFT JOIN task_locations tl ON tl.task_id = t.id
      LEFT JOIN task_roles tr ON tr.task_id = t.id
      LEFT JOIN employee_roles er_direct ON er_direct.id = t.assigned_role_id
      LEFT JOIN employee_roles er_junction ON er_junction.id = tr.role_id
      LEFT JOIN LATERAL (
        SELECT DISTINCT tc.occurrence_date
        FROM task_completions tc
        WHERE tc.task_id = t.id
          AND tc.occurrence_date >= p_start_date
          AND tc.occurrence_date <= p_end_date
        UNION
        SELECT p_start_date AS occurrence_date
        WHERE t.recurrence_type IS NULL
          AND t.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
          AND t.created_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC')
      ) tc_dates ON true
      WHERE t.assigned_to IS NULL
        AND COALESCE(t.is_individual, false) = true
        AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
        AND (
          (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
          OR lower(trim(translate(COALESCE(er_direct.name, er_junction.name, ''), 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role
        )
        AND tc_dates.occurrence_date IN (
          SELECT s.shift_date
          FROM shifts s
          INNER JOIN shift_assignments sa ON sa.shift_id = s.id
          WHERE sa.staff_id = v_emp.id
            AND sa.approval_status = 'approved'
            AND s.shift_date >= p_start_date
            AND s.shift_date <= p_end_date
        )
      GROUP BY t.id
    ) sub;

    -- Individual task completions: NOW with role filter + shift-day filter
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE COALESCE(tc.completed_late, false) = false)
    INTO v_individual_tasks_completed, v_individual_tasks_completed_on_time
    FROM task_completions tc
    INNER JOIN tasks t ON t.id = tc.task_id
    LEFT JOIN task_locations tl ON tl.task_id = t.id
    LEFT JOIN task_roles tr ON tr.task_id = t.id
    LEFT JOIN employee_roles er_direct ON er_direct.id = t.assigned_role_id
    LEFT JOIN employee_roles er_junction ON er_junction.id = tr.role_id
    WHERE tc.completed_by_employee_id = v_emp.id
      AND tc.occurrence_date >= p_start_date
      AND tc.occurrence_date <= p_end_date
      AND t.assigned_to IS NULL
      AND COALESCE(t.is_individual, false) = true
      AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
      -- Role filter
      AND (
        (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
        OR lower(trim(translate(COALESCE(er_direct.name, er_junction.name, ''), 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role
      )
      -- Shift-day filter
      AND tc.occurrence_date IN (
        SELECT s.shift_date
        FROM shifts s
        INNER JOIN shift_assignments sa ON sa.shift_id = s.id
        WHERE sa.staff_id = v_emp.id
          AND sa.approval_status = 'approved'
          AND s.shift_date >= p_start_date
          AND s.shift_date <= p_end_date
      );

    -- Merged totals
    v_tasks_assigned := v_direct_assigned + v_shared_tasks_assigned + v_individual_tasks_assigned;
    v_tasks_completed := v_direct_completed + v_completion_count + v_individual_tasks_completed;
    v_tasks_completed_on_time := v_direct_completed_on_time + v_completion_on_time_count + v_individual_tasks_completed_on_time;

    -- ==================== TESTS ====================
    SELECT COUNT(*), COUNT(*) FILTER (WHERE ts.passed = true), 
           COALESCE(AVG(ts.score), 0)
    INTO v_tests_taken, v_tests_passed, v_avg_test_score
    FROM test_submissions ts
    WHERE ts.employee_id = v_emp.id
      AND ts.completed_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND ts.completed_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC');

    -- ==================== PERFORMANCE REVIEWS ====================
    SELECT COUNT(*), COALESCE(AVG(sa.score), 0)
    INTO v_reviews_count, v_avg_review_score
    FROM staff_audits sa
    WHERE sa.employee_id = v_emp.id
      AND sa.audit_date >= p_start_date
      AND sa.audit_date <= p_end_date;

    -- ==================== EFFECTIVE SCORING ====================
    v_used_count := 0;
    v_used_sum := 0;

    v_attendance_used := v_shifts_scheduled > 0;
    IF v_attendance_used THEN
      v_attendance_score := (v_shifts_worked::NUMERIC / v_shifts_scheduled) * 100;
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_attendance_score;
    ELSE
      v_attendance_score := 0;
    END IF;

    v_punctuality_used := v_shifts_scheduled > 0;
    v_late_deduction := LEAST(v_late_count * 5, 100);
    v_late_min_deduction := LEAST(FLOOR(v_total_late_minutes::NUMERIC / 10), 50);
    v_punctuality_score := GREATEST(0, 100 - v_late_deduction - v_late_min_deduction);
    IF v_punctuality_used THEN
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_punctuality_score;
    END IF;

    v_task_used := v_tasks_assigned > 0;
    IF v_task_used THEN
      v_task_score := LEAST(100, (v_tasks_completed_on_time::NUMERIC / v_tasks_assigned) * 100);
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_task_score;
    ELSE
      v_task_score := 0;
    END IF;

    v_test_used := v_tests_taken > 0;
    IF v_test_used THEN
      v_test_score := v_avg_test_score;
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_test_score;
    ELSE
      v_test_score := 0;
    END IF;

    v_review_used := v_reviews_count > 0;
    IF v_review_used THEN
      v_review_score := v_avg_review_score;
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_review_score;
    ELSE
      v_review_score := 0;
    END IF;

    IF v_used_count > 0 THEN
      v_base_score := v_used_sum / v_used_count;
    ELSE
      v_base_score := 0;
    END IF;

    -- ==================== WARNINGS ====================
    v_warning_penalty := 0;
    v_warning_count := 0;

    SELECT COUNT(*), COALESCE(SUM(
      CASE
        WHEN COALESCE((se.metadata->>'severity'), 'minor') = 'major' THEN 10
        ELSE 5
      END * GREATEST(0, 1.0 - (EXTRACT(EPOCH FROM (v_today - se.event_date::date)) / (90 * 86400)))
    ), 0)
    INTO v_warning_count, v_warning_penalty
    FROM staff_events se
    WHERE se.staff_id = v_emp.id
      AND se.event_type = 'warning'
      AND se.event_date >= v_ninety_days_ago::text;

    v_overall_score := GREATEST(0, LEAST(100, v_base_score - v_warning_penalty));

    RETURN QUERY SELECT
      v_emp.id,
      v_emp.full_name,
      v_emp.role,
      p_location_id,
      v_loc_name,
      v_emp.avatar_url,
      v_attendance_score,
      v_punctuality_score,
      v_task_score,
      v_test_score,
      v_review_score,
      v_base_score,
      v_warning_penalty,
      v_warning_count,
      v_overall_score,
      v_shifts_scheduled,
      v_shifts_worked,
      v_shifts_missed,
      v_late_count,
      v_total_late_minutes,
      v_tasks_assigned,
      v_tasks_completed,
      v_tasks_completed_on_time,
      v_tasks_overdue,
      v_tests_taken,
      v_tests_passed,
      v_avg_test_score,
      v_reviews_count,
      v_avg_review_score;
  END LOOP;
END;
$function$;
