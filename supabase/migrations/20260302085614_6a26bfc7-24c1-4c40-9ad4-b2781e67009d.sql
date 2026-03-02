
CREATE OR REPLACE FUNCTION public.calculate_location_performance_scores(p_location_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(employee_id uuid, employee_name text, role text, location_id uuid, location_name text, avatar_url text, attendance_score numeric, punctuality_score numeric, task_score numeric, test_score numeric, performance_review_score numeric, base_score numeric, warning_penalty numeric, warning_count integer, overall_score numeric, shifts_scheduled integer, shifts_worked integer, shifts_missed integer, late_count integer, total_late_minutes integer, tasks_assigned integer, tasks_completed integer, tasks_completed_on_time integer, tasks_overdue integer, tests_taken integer, tests_passed integer, average_test_score numeric, reviews_count integer, average_review_score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_ninety_days_ago DATE := CURRENT_DATE - 90;
  v_emp RECORD;
  v_loc_name TEXT;
  -- Per-employee computed values
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
  -- Effective scoring tracking
  v_used_count INT;
  v_used_sum NUMERIC;
  v_attendance_used BOOLEAN;
  v_punctuality_used BOOLEAN;
  v_task_used BOOLEAN;
  v_test_used BOOLEAN;
  v_review_used BOOLEAN;
BEGIN
  -- Get location name
  SELECT l.name INTO v_loc_name FROM locations l WHERE l.id = p_location_id;

  -- FIX #2: Loop through active employees at this location OR with approved shifts here
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
    -- Normalize employee role for matching
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

    -- Shared task completions (non-individual, non-direct)
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE COALESCE(tc.completed_late, false) = false)
    INTO v_completion_count, v_completion_on_time_count
    FROM task_completions tc
    INNER JOIN tasks t ON t.id = tc.task_id
    LEFT JOIN task_locations tl ON tl.task_id = t.id
    WHERE tc.completed_by_employee_id = v_emp.id
      AND tc.occurrence_date >= p_start_date
      AND tc.occurrence_date <= p_end_date
      AND t.assigned_to IS NULL
      AND COALESCE(t.is_individual, false) = false
      AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
      AND t.id NOT IN (SELECT t2.id FROM tasks t2 WHERE t2.assigned_to = v_emp.id);

    -- ==================== FIX #3: INDIVIDUAL TASKS ====================
    -- Individual tasks: each one counts as 1 assigned per employee per occurrence,
    -- completions are per-employee (completed_by_employee_id = v_emp.id)
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

    -- Individual task completions by THIS employee
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE COALESCE(tc.completed_late, false) = false)
    INTO v_individual_tasks_completed, v_individual_tasks_completed_on_time
    FROM task_completions tc
    INNER JOIN tasks t ON t.id = tc.task_id
    LEFT JOIN task_locations tl ON tl.task_id = t.id
    WHERE tc.completed_by_employee_id = v_emp.id
      AND tc.occurrence_date >= p_start_date
      AND tc.occurrence_date <= p_end_date
      AND t.assigned_to IS NULL
      AND COALESCE(t.is_individual, false) = true
      AND (t.location_id = p_location_id OR tl.location_id = p_location_id);

    -- Merged totals (direct + shared + individual)
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

    -- ==================== FIX #4: EFFECTIVE SCORING ====================
    -- Only compute scores for components with real data
    v_used_count := 0;
    v_used_sum := 0;

    -- Attendance
    v_attendance_used := v_shifts_scheduled > 0;
    IF v_attendance_used THEN
      v_attendance_score := (v_shifts_worked::NUMERIC / v_shifts_scheduled) * 100;
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_attendance_score;
    ELSE
      v_attendance_score := 0;
    END IF;

    -- Punctuality
    v_punctuality_used := v_shifts_scheduled > 0;
    v_late_deduction := LEAST(v_late_count * 5, 100);
    v_late_min_deduction := LEAST(FLOOR(v_total_late_minutes::NUMERIC / 10), 50);
    v_punctuality_score := GREATEST(0, 100 - v_late_deduction - v_late_min_deduction);
    IF v_punctuality_used THEN
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_punctuality_score;
    END IF;

    -- FIX #1: Task score capped at 100
    v_task_used := v_tasks_assigned > 0;
    IF v_task_used THEN
      v_task_score := LEAST(100, (v_tasks_completed_on_time::NUMERIC / v_tasks_assigned) * 100);
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_task_score;
    ELSE
      v_task_score := 0;
    END IF;

    -- Tests
    v_test_used := v_tests_taken > 0;
    IF v_test_used THEN
      v_test_score := v_avg_test_score;
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_test_score;
    ELSE
      v_test_score := 0;
    END IF;

    -- Reviews
    v_review_used := v_reviews_count > 0;
    IF v_review_used THEN
      v_review_score := v_avg_review_score;
      v_used_count := v_used_count + 1;
      v_used_sum := v_used_sum + v_review_score;
    ELSE
      v_review_score := 0;
    END IF;

    -- Base score = average of USED components only
    IF v_used_count > 0 THEN
      v_base_score := v_used_sum / v_used_count;
    ELSE
      v_base_score := 0;
    END IF;

    -- ==================== WARNING PENALTY ====================
    SELECT 
      COALESCE(SUM(capped_penalty), 0),
      COALESCE(SUM(w_count), 0)::INT
    INTO v_warning_penalty, v_warning_count
    FROM (
      SELECT 
        month_key,
        LEAST(SUM(effective_points), 10) AS capped_penalty,
        COUNT(*) AS w_count
      FROM (
        SELECT
          se.id,
          to_char(se.event_date::date, 'YYYY-MM') AS month_key,
          CASE COALESCE((se.metadata->>'severity'), 'minor')
            WHEN 'minor' THEN 2
            WHEN 'major' THEN 5
            WHEN 'critical' THEN 10
            ELSE 2
          END *
          CASE 
            WHEN (
              SELECT COUNT(*) FROM staff_events se2
              WHERE se2.staff_id = se.staff_id
                AND se2.event_type = 'warning'
                AND COALESCE(se2.metadata->>'category', 'other') = COALESCE(se.metadata->>'category', 'other')
                AND se2.event_date < se.event_date
                AND se2.event_date >= (se.event_date::date - 60)
            ) = 0 THEN 1.0
            WHEN (
              SELECT COUNT(*) FROM staff_events se2
              WHERE se2.staff_id = se.staff_id
                AND se2.event_type = 'warning'
                AND COALESCE(se2.metadata->>'category', 'other') = COALESCE(se.metadata->>'category', 'other')
                AND se2.event_date < se.event_date
                AND se2.event_date >= (se.event_date::date - 60)
            ) = 1 THEN 1.5
            ELSE 2.0
          END *
          CASE 
            WHEN (v_today - se.event_date::date) <= 30 THEN 1.0
            WHEN (v_today - se.event_date::date) <= 60 THEN 0.6
            WHEN (v_today - se.event_date::date) <= 90 THEN 0.3
            ELSE 0
          END AS effective_points
        FROM staff_events se
        WHERE se.staff_id = v_emp.id
          AND se.event_type = 'warning'
          AND se.event_date >= v_ninety_days_ago
      ) warnings_calc
      GROUP BY month_key
    ) monthly_caps;

    -- Overall score
    IF v_used_count > 0 THEN
      v_overall_score := GREATEST(0, LEAST(100, v_base_score - v_warning_penalty));
    ELSE
      v_overall_score := 0;
    END IF;

    -- Return row
    employee_id := v_emp.id;
    employee_name := v_emp.full_name;
    role := v_emp.role;
    location_id := v_emp.location_id;
    location_name := v_loc_name;
    avatar_url := v_emp.avatar_url;
    attendance_score := ROUND(v_attendance_score, 2);
    punctuality_score := ROUND(v_punctuality_score, 2);
    task_score := ROUND(v_task_score, 2);
    test_score := ROUND(v_test_score, 2);
    performance_review_score := ROUND(v_review_score, 2);
    base_score := ROUND(v_base_score, 2);
    warning_penalty := ROUND(v_warning_penalty, 2);
    warning_count := v_warning_count;
    overall_score := ROUND(v_overall_score, 2);
    shifts_scheduled := v_shifts_scheduled;
    shifts_worked := v_shifts_worked;
    shifts_missed := v_shifts_missed;
    late_count := v_late_count;
    total_late_minutes := v_total_late_minutes;
    tasks_assigned := v_tasks_assigned;
    tasks_completed := v_tasks_completed;
    tasks_completed_on_time := v_tasks_completed_on_time;
    tasks_overdue := v_tasks_overdue;
    tests_taken := v_tests_taken;
    tests_passed := v_tests_passed;
    average_test_score := ROUND(v_avg_test_score, 2);
    reviews_count := v_reviews_count;
    average_review_score := ROUND(v_avg_review_score, 2);
    RETURN NEXT;
  END LOOP;
END;
$function$;
