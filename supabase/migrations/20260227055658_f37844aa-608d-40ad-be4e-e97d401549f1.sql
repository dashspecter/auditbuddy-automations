
-- Server-side performance scoring function that bypasses RLS
-- Fixes bugs where kiosk/anonymous sessions can't see task_completions, warnings, etc.

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
BEGIN
  -- Get location name
  SELECT l.name INTO v_loc_name FROM locations l WHERE l.id = p_location_id;

  -- Loop through active employees at this location
  FOR v_emp IN 
    SELECT e.id, e.full_name, e.role, e.location_id, e.avatar_url
    FROM employees e
    WHERE e.location_id = p_location_id AND e.status = 'active'
  LOOP
    -- Normalize employee role for matching
    v_emp_normalized_role := lower(trim(regexp_replace(
      translate(v_emp.role, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'),
      '\s+', ' ', 'g'
    )));

    -- ==================== ATTENDANCE ====================
    -- Count past shifts scheduled for this employee (approved assignments)
    SELECT COUNT(*) INTO v_shifts_scheduled
    FROM shifts s
    INNER JOIN shift_assignments sa ON sa.shift_id = s.id
    WHERE sa.staff_id = v_emp.id
      AND s.location_id = p_location_id
      AND s.shift_date >= p_start_date
      AND s.shift_date <= p_end_date
      AND s.shift_date <= v_today
      AND sa.approval_status = 'approved';

    -- Count shifts worked (has attendance or location doesn't require checkin)
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

    -- Count overdue direct tasks
    SELECT COUNT(*) INTO v_tasks_overdue
    FROM tasks t
    WHERE t.assigned_to = v_emp.id
      AND t.status != 'completed'
      AND t.due_at IS NOT NULL
      AND t.due_at < now()
      AND t.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND t.created_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC');

    -- ==================== SHARED TASKS (Bug fix: proper counting) ====================
    -- Get employee's shift dates in the period
    -- Count shared task occurrences assigned to this employee
    -- A shared task is assigned if: location matches AND (no roles OR employee's role matches)
    -- Only count on days employee had an approved shift

    SELECT COALESCE(SUM(occ_count), 0) INTO v_shared_tasks_assigned
    FROM (
      SELECT t.id AS task_id, COUNT(DISTINCT tc_dates.occurrence_date) AS occ_count
      FROM tasks t
      -- Match location via task_locations junction or task.location_id
      LEFT JOIN task_locations tl ON tl.task_id = t.id
      -- Match roles via task_roles junction or task.assigned_role_id  
      LEFT JOIN task_roles tr ON tr.task_id = t.id
      LEFT JOIN employee_roles er_direct ON er_direct.id = t.assigned_role_id
      LEFT JOIN employee_roles er_junction ON er_junction.id = tr.role_id
      -- Get occurrence dates from task_completions in period
      LEFT JOIN LATERAL (
        SELECT DISTINCT tc.occurrence_date
        FROM task_completions tc
        WHERE tc.task_id = t.id
          AND tc.occurrence_date >= p_start_date
          AND tc.occurrence_date <= p_end_date
        UNION
        -- For non-recurring tasks, use start_date as single occurrence
        SELECT p_start_date AS occurrence_date
        WHERE t.recurrence_type IS NULL
          AND t.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
          AND t.created_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC')
      ) tc_dates ON true
      WHERE t.assigned_to IS NULL
        AND COALESCE(t.is_individual, false) = false
        -- Location match
        AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
        -- Role match: no roles specified OR employee matches
        AND (
          (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
          OR lower(trim(translate(COALESCE(er_direct.name, er_junction.name, ''), 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role
        )
        -- Only count on employee's shift dates
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

    -- ==================== TASK COMPLETIONS (non-direct, shared only) ====================
    -- Bug fix: Only count completions for tasks that ARE in the shared task set
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
      -- Only count completions for tasks at this location
      AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
      -- Exclude direct tasks (already counted above)
      AND t.id NOT IN (SELECT t2.id FROM tasks t2 WHERE t2.assigned_to = v_emp.id);

    -- Merged totals
    v_tasks_assigned := v_direct_assigned + v_shared_tasks_assigned;
    v_tasks_completed := v_direct_completed + v_completion_count;
    v_tasks_completed_on_time := v_direct_completed_on_time + v_completion_on_time_count;

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

    -- ==================== COMPUTE SCORES ====================
    -- Attendance score
    IF v_shifts_scheduled > 0 THEN
      v_attendance_score := (v_shifts_worked::NUMERIC / v_shifts_scheduled) * 100;
    ELSE
      v_attendance_score := 100;
    END IF;

    -- Punctuality score
    v_late_deduction := LEAST(v_late_count * 5, 100);
    v_late_min_deduction := LEAST(FLOOR(v_total_late_minutes::NUMERIC / 10), 50);
    v_punctuality_score := GREATEST(0, 100 - v_late_deduction - v_late_min_deduction);

    -- Task score
    IF v_tasks_assigned > 0 THEN
      v_task_score := (v_tasks_completed_on_time::NUMERIC / v_tasks_assigned) * 100;
    ELSE
      v_task_score := 100;
    END IF;

    -- Test score
    IF v_tests_taken > 0 THEN
      v_test_score := v_avg_test_score;
    ELSE
      v_test_score := 100;
    END IF;

    -- Review score
    IF v_reviews_count > 0 THEN
      v_review_score := v_avg_review_score;
    ELSE
      v_review_score := 100;
    END IF;

    -- Base score (equal weight)
    v_base_score := (v_attendance_score + v_punctuality_score + v_task_score + v_test_score + v_review_score) / 5;

    -- ==================== WARNING PENALTY ====================
    -- Replicate the JS warning penalty logic: severity points * repeat multiplier * decay factor, monthly cap 10
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
          -- Repeat multiplier (count prior same-category warnings within 60 days)
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
          -- Decay factor based on age
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
    v_overall_score := GREATEST(0, LEAST(100, v_base_score - v_warning_penalty));

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
