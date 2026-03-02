
-- Fix P1: task_occurs_on_date strict inequality (change <= to <, so creation date returns TRUE)
-- Fix P2: eligible count role matching uses LIMIT 1 — change to use EXISTS with ANY

-- Step 1: Fix task_occurs_on_date — change <= to < so creation date is included
CREATE OR REPLACE FUNCTION public.task_occurs_on_date(
  p_recurrence_type TEXT,
  p_task_created_at TIMESTAMPTZ,
  p_recurrence_interval INT,
  p_recurrence_days_of_week INT[],
  p_recurrence_end_date TIMESTAMPTZ,
  p_target_date DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task_date DATE;
  v_day_diff INT;
  v_week_diff INT;
  v_target_dow INT;
  v_task_dow INT;
  v_interval INT;
  v_normalized_days INT[];
  v_max_val INT;
  v_d INT;
  v_day_match BOOLEAN;
BEGIN
  v_task_date := (p_task_created_at AT TIME ZONE 'Europe/Bucharest')::DATE;
  v_interval := COALESCE(p_recurrence_interval, 1);
  
  -- FIX: Changed from <= to < so that creation date itself returns TRUE
  IF p_target_date < v_task_date THEN RETURN FALSE; END IF;
  
  IF p_recurrence_end_date IS NOT NULL AND p_target_date > (p_recurrence_end_date AT TIME ZONE 'Europe/Bucharest')::DATE THEN
    RETURN FALSE;
  END IF;
  IF p_recurrence_type IS NULL OR p_recurrence_type = 'none' OR p_recurrence_type = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Creation date always counts for recurring tasks
  IF p_target_date = v_task_date THEN RETURN TRUE; END IF;
  
  v_day_diff := p_target_date - v_task_date;
  v_target_dow := EXTRACT(DOW FROM p_target_date)::INT;
  v_task_dow := EXTRACT(DOW FROM v_task_date)::INT;
  IF p_recurrence_type = 'daily' THEN
    RETURN (v_day_diff % v_interval) = 0;
  ELSIF p_recurrence_type = 'weekdays' THEN
    RETURN v_target_dow BETWEEN 1 AND 5;
  ELSIF p_recurrence_type = 'weekly' THEN
    IF p_recurrence_days_of_week IS NOT NULL AND array_length(p_recurrence_days_of_week, 1) > 0 THEN
      v_max_val := 0;
      FOREACH v_d IN ARRAY p_recurrence_days_of_week LOOP
        IF v_d > v_max_val THEN v_max_val := v_d; END IF;
      END LOOP;
      IF v_max_val > 6 THEN
        v_normalized_days := ARRAY(SELECT CASE WHEN d = 7 THEN 0 ELSE d END FROM unnest(p_recurrence_days_of_week) AS d);
      ELSE
        v_normalized_days := p_recurrence_days_of_week;
      END IF;
      v_day_match := v_target_dow = ANY(v_normalized_days);
      IF NOT v_day_match THEN RETURN FALSE; END IF;
      v_week_diff := v_day_diff / 7;
      RETURN (v_week_diff % v_interval) = 0;
    ELSE
      IF v_target_dow != v_task_dow THEN RETURN FALSE; END IF;
      v_week_diff := v_day_diff / 7;
      RETURN (v_week_diff % v_interval) = 0;
    END IF;
  ELSIF p_recurrence_type = 'monthly' THEN
    RETURN EXTRACT(DAY FROM p_target_date) = EXTRACT(DAY FROM v_task_date);
  END IF;
  RETURN FALSE;
END;
$$;

-- Step 2: Fix calculate_location_performance_scores — fix LIMIT 1 role matching in eligible count
-- Replace the entire function with fixed role matching that uses EXISTS + ANY instead of LIMIT 1
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
  v_fair_share_total NUMERIC;
  v_individual_fair_share NUMERIC;
  v_shift_day RECORD;
  v_task_rec RECORD;
  v_time_slot TEXT;
  v_task_time TIME;
  v_eligible_count INT;
  v_task_occurs BOOLEAN;
  v_time_slots TEXT[];
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

    -- ATTENDANCE
    SELECT COUNT(*) INTO v_shifts_scheduled
    FROM shifts s
    INNER JOIN shift_assignments sa ON sa.shift_id = s.id
    WHERE sa.staff_id = v_emp.id
      AND s.location_id = p_location_id
      AND s.shift_date >= p_start_date AND s.shift_date <= p_end_date
      AND s.shift_date <= v_today
      AND sa.approval_status = 'approved';

    SELECT COUNT(*) INTO v_shifts_worked
    FROM shifts s
    INNER JOIN shift_assignments sa ON sa.shift_id = s.id
    LEFT JOIN locations loc ON loc.id = s.location_id
    WHERE sa.staff_id = v_emp.id
      AND s.location_id = p_location_id
      AND s.shift_date >= p_start_date AND s.shift_date <= p_end_date
      AND s.shift_date <= v_today
      AND sa.approval_status = 'approved'
      AND (
        EXISTS (SELECT 1 FROM attendance_logs al WHERE al.staff_id = v_emp.id AND al.shift_id = s.id)
        OR COALESCE(loc.requires_checkin, true) = false
      );

    v_shifts_missed := v_shifts_scheduled - v_shifts_worked;

    -- PUNCTUALITY
    SELECT COUNT(*), COALESCE(SUM(al.late_minutes), 0)
    INTO v_late_count, v_total_late_minutes
    FROM attendance_logs al
    WHERE al.staff_id = v_emp.id
      AND al.check_in_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND al.check_in_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC')
      AND al.is_late = true;

    -- DIRECT TASKS
    SELECT COUNT(*),
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
      AND t.due_at IS NOT NULL AND t.due_at < now()
      AND t.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND t.created_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC');

    -- SHARED TASKS (FAIR SHARE)
    v_fair_share_total := 0;
    FOR v_shift_day IN
      SELECT DISTINCT s.shift_date, MIN(s.start_time) AS emp_shift_start, MAX(s.end_time) AS emp_shift_end
      FROM shifts s
      INNER JOIN shift_assignments sa ON sa.shift_id = s.id
      WHERE sa.staff_id = v_emp.id AND s.location_id = p_location_id
        AND s.shift_date >= p_start_date AND s.shift_date <= p_end_date AND s.shift_date <= v_today
        AND sa.approval_status = 'approved'
      GROUP BY s.shift_date
    LOOP
      FOR v_task_rec IN
        SELECT DISTINCT t.id, t.recurrence_type, t.created_at AS task_created_at,
               t.recurrence_interval, t.recurrence_days_of_week, t.recurrence_end_date,
               t.recurrence_times, t.start_at, t.assigned_role_id
        FROM tasks t
        LEFT JOIN task_locations tl ON tl.task_id = t.id
        WHERE t.assigned_to IS NULL
          AND COALESCE(t.is_individual, false) = false
          AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
          AND (
            -- No role restriction
            (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
            -- Direct role match
            OR EXISTS (SELECT 1 FROM employee_roles er WHERE er.id = t.assigned_role_id
                       AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role)
            -- Junction table role match (ANY, not LIMIT 1)
            OR EXISTS (SELECT 1 FROM task_roles tr JOIN employee_roles er ON er.id = tr.role_id
                       WHERE tr.task_id = t.id
                       AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role)
          )
      LOOP
        -- Simplified: task_occurs_on_date now handles creation date correctly
        IF v_task_rec.recurrence_type IS NULL OR v_task_rec.recurrence_type = 'none' OR v_task_rec.recurrence_type = '' THEN
          v_task_occurs := (v_task_rec.task_created_at AT TIME ZONE 'Europe/Bucharest')::DATE = v_shift_day.shift_date;
        ELSE
          v_task_occurs := task_occurs_on_date(v_task_rec.recurrence_type, v_task_rec.task_created_at, v_task_rec.recurrence_interval, v_task_rec.recurrence_days_of_week, v_task_rec.recurrence_end_date, v_shift_day.shift_date);
        END IF;
        
        IF v_task_occurs THEN
          IF v_task_rec.recurrence_times IS NOT NULL AND array_length(v_task_rec.recurrence_times, 1) > 0 THEN
            v_time_slots := v_task_rec.recurrence_times;
          ELSIF v_task_rec.start_at IS NOT NULL THEN
            v_time_slots := ARRAY[to_char((v_task_rec.start_at AT TIME ZONE 'Europe/Bucharest')::TIME, 'HH24:MI')];
          ELSE
            v_time_slots := ARRAY[NULL::TEXT];
          END IF;
          
          FOREACH v_time_slot IN ARRAY v_time_slots LOOP
            IF v_time_slot IS NOT NULL AND v_time_slot != '' THEN
              v_task_time := v_time_slot::TIME;
              -- FIX P2: Use EXISTS with ANY for multi-role tasks instead of LIMIT 1
              SELECT COUNT(DISTINCT sa2.staff_id) INTO v_eligible_count
              FROM shift_assignments sa2
              INNER JOIN shifts s2 ON s2.id = sa2.shift_id
              INNER JOIN employees emp2 ON emp2.id = sa2.staff_id AND emp2.status = 'active'
              WHERE s2.location_id = p_location_id AND s2.shift_date = v_shift_day.shift_date
                AND sa2.approval_status = 'approved'
                AND s2.start_time <= v_task_time AND s2.end_time >= v_task_time
                AND (
                  (v_task_rec.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr3 WHERE tr3.task_id = v_task_rec.id))
                  OR EXISTS (SELECT 1 FROM employee_roles er3 WHERE er3.id = v_task_rec.assigned_role_id
                             AND lower(trim(translate(er3.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = 
                             lower(trim(regexp_replace(translate(emp2.role, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'), '\s+', ' ', 'g'))))
                  OR EXISTS (SELECT 1 FROM task_roles tr4 JOIN employee_roles er4 ON er4.id = tr4.role_id
                             WHERE tr4.task_id = v_task_rec.id
                             AND lower(trim(translate(er4.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = 
                             lower(trim(regexp_replace(translate(emp2.role, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'), '\s+', ' ', 'g'))))
                );
              IF v_shift_day.emp_shift_start <= v_task_time AND v_shift_day.emp_shift_end >= v_task_time AND v_eligible_count > 0 THEN
                v_fair_share_total := v_fair_share_total + (1.0 / v_eligible_count);
              END IF;
            ELSE
              -- No specific time: count all on-shift employees matching role
              SELECT COUNT(DISTINCT sa2.staff_id) INTO v_eligible_count
              FROM shift_assignments sa2
              INNER JOIN shifts s2 ON s2.id = sa2.shift_id
              INNER JOIN employees emp2 ON emp2.id = sa2.staff_id AND emp2.status = 'active'
              WHERE s2.location_id = p_location_id AND s2.shift_date = v_shift_day.shift_date
                AND sa2.approval_status = 'approved'
                AND (
                  (v_task_rec.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr3 WHERE tr3.task_id = v_task_rec.id))
                  OR EXISTS (SELECT 1 FROM employee_roles er3 WHERE er3.id = v_task_rec.assigned_role_id
                             AND lower(trim(translate(er3.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = 
                             lower(trim(regexp_replace(translate(emp2.role, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'), '\s+', ' ', 'g'))))
                  OR EXISTS (SELECT 1 FROM task_roles tr4 JOIN employee_roles er4 ON er4.id = tr4.role_id
                             WHERE tr4.task_id = v_task_rec.id
                             AND lower(trim(translate(er4.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = 
                             lower(trim(regexp_replace(translate(emp2.role, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'), '\s+', ' ', 'g'))))
                );
              IF v_eligible_count > 0 THEN
                v_fair_share_total := v_fair_share_total + (1.0 / v_eligible_count);
              END IF;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;
    v_shared_tasks_assigned := ROUND(v_fair_share_total)::INT;

    -- Shared task completions
    SELECT COUNT(*), COUNT(*) FILTER (WHERE COALESCE(tc.completed_late, false) = false)
    INTO v_completion_count, v_completion_on_time_count
    FROM task_completions tc
    INNER JOIN tasks t ON t.id = tc.task_id
    LEFT JOIN task_locations tl ON tl.task_id = t.id
    WHERE tc.completed_by_employee_id = v_emp.id
      AND tc.occurrence_date >= p_start_date AND tc.occurrence_date <= p_end_date
      AND t.assigned_to IS NULL AND COALESCE(t.is_individual, false) = false
      AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
      AND t.id NOT IN (SELECT t2.id FROM tasks t2 WHERE t2.assigned_to = v_emp.id)
      AND (
        (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
        OR EXISTS (SELECT 1 FROM employee_roles er WHERE er.id = t.assigned_role_id
                   AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role)
        OR EXISTS (SELECT 1 FROM task_roles tr JOIN employee_roles er ON er.id = tr.role_id
                   WHERE tr.task_id = t.id
                   AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role)
      )
      AND tc.occurrence_date IN (
        SELECT s.shift_date FROM shifts s
        INNER JOIN shift_assignments sa ON sa.shift_id = s.id
        WHERE sa.staff_id = v_emp.id AND sa.approval_status = 'approved'
          AND s.shift_date >= p_start_date AND s.shift_date <= p_end_date
      );

    -- INDIVIDUAL TASKS (FAIR SHARE - each counts as 1 per eligible employee)
    v_individual_fair_share := 0;
    FOR v_shift_day IN
      SELECT DISTINCT s.shift_date, MIN(s.start_time) AS emp_shift_start, MAX(s.end_time) AS emp_shift_end
      FROM shifts s
      INNER JOIN shift_assignments sa ON sa.shift_id = s.id
      WHERE sa.staff_id = v_emp.id AND s.location_id = p_location_id
        AND s.shift_date >= p_start_date AND s.shift_date <= p_end_date AND s.shift_date <= v_today
        AND sa.approval_status = 'approved'
      GROUP BY s.shift_date
    LOOP
      FOR v_task_rec IN
        SELECT DISTINCT t.id, t.recurrence_type, t.created_at AS task_created_at,
               t.recurrence_interval, t.recurrence_days_of_week, t.recurrence_end_date,
               t.recurrence_times, t.start_at, t.assigned_role_id
        FROM tasks t
        LEFT JOIN task_locations tl ON tl.task_id = t.id
        WHERE t.assigned_to IS NULL AND COALESCE(t.is_individual, false) = true
          AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
          AND (
            (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
            OR EXISTS (SELECT 1 FROM employee_roles er WHERE er.id = t.assigned_role_id
                       AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role)
            OR EXISTS (SELECT 1 FROM task_roles tr JOIN employee_roles er ON er.id = tr.role_id
                       WHERE tr.task_id = t.id
                       AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role)
          )
      LOOP
        IF v_task_rec.recurrence_type IS NULL OR v_task_rec.recurrence_type = 'none' OR v_task_rec.recurrence_type = '' THEN
          v_task_occurs := (v_task_rec.task_created_at AT TIME ZONE 'Europe/Bucharest')::DATE = v_shift_day.shift_date;
        ELSE
          v_task_occurs := task_occurs_on_date(v_task_rec.recurrence_type, v_task_rec.task_created_at, v_task_rec.recurrence_interval, v_task_rec.recurrence_days_of_week, v_task_rec.recurrence_end_date, v_shift_day.shift_date);
        END IF;
        IF v_task_occurs THEN
          IF v_task_rec.recurrence_times IS NOT NULL AND array_length(v_task_rec.recurrence_times, 1) > 0 THEN
            v_time_slots := v_task_rec.recurrence_times;
          ELSIF v_task_rec.start_at IS NOT NULL THEN
            v_time_slots := ARRAY[to_char((v_task_rec.start_at AT TIME ZONE 'Europe/Bucharest')::TIME, 'HH24:MI')];
          ELSE
            v_time_slots := ARRAY[NULL::TEXT];
          END IF;
          FOREACH v_time_slot IN ARRAY v_time_slots LOOP
            IF v_time_slot IS NOT NULL AND v_time_slot != '' THEN
              v_task_time := v_time_slot::TIME;
              IF v_shift_day.emp_shift_start <= v_task_time AND v_shift_day.emp_shift_end >= v_task_time THEN
                v_individual_fair_share := v_individual_fair_share + 1;
              END IF;
            ELSE
              v_individual_fair_share := v_individual_fair_share + 1;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;
    v_individual_tasks_assigned := v_individual_fair_share::INT;

    -- Individual task completions
    SELECT COUNT(*), COUNT(*) FILTER (WHERE COALESCE(tc.completed_late, false) = false)
    INTO v_individual_tasks_completed, v_individual_tasks_completed_on_time
    FROM task_completions tc
    INNER JOIN tasks t ON t.id = tc.task_id
    LEFT JOIN task_locations tl ON tl.task_id = t.id
    WHERE tc.completed_by_employee_id = v_emp.id
      AND tc.occurrence_date >= p_start_date AND tc.occurrence_date <= p_end_date
      AND t.assigned_to IS NULL AND COALESCE(t.is_individual, false) = true
      AND (t.location_id = p_location_id OR tl.location_id = p_location_id)
      AND (
        (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
        OR EXISTS (SELECT 1 FROM employee_roles er WHERE er.id = t.assigned_role_id
                   AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role)
        OR EXISTS (SELECT 1 FROM task_roles tr JOIN employee_roles er ON er.id = tr.role_id
                   WHERE tr.task_id = t.id
                   AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role)
      )
      AND tc.occurrence_date IN (
        SELECT s.shift_date FROM shifts s
        INNER JOIN shift_assignments sa ON sa.shift_id = s.id
        WHERE sa.staff_id = v_emp.id AND sa.approval_status = 'approved'
          AND s.shift_date >= p_start_date AND s.shift_date <= p_end_date
      );

    -- Merged totals
    v_tasks_assigned := v_direct_assigned + v_shared_tasks_assigned + v_individual_tasks_assigned;
    v_tasks_completed := v_direct_completed + v_completion_count + v_individual_tasks_completed;
    v_tasks_completed_on_time := v_direct_completed_on_time + v_completion_on_time_count + v_individual_tasks_completed_on_time;

    -- TESTS
    SELECT COUNT(*), COUNT(*) FILTER (WHERE ts.passed = true), COALESCE(AVG(ts.score), 0)
    INTO v_tests_taken, v_tests_passed, v_avg_test_score
    FROM test_submissions ts
    WHERE ts.employee_id = v_emp.id
      AND ts.completed_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND ts.completed_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC');

    -- PERFORMANCE REVIEWS
    SELECT COUNT(*), COALESCE(AVG(sa.score), 0)
    INTO v_reviews_count, v_avg_review_score
    FROM staff_audits sa
    WHERE sa.employee_id = v_emp.id AND sa.audit_date >= p_start_date AND sa.audit_date <= p_end_date;

    -- EFFECTIVE SCORING
    v_used_count := 0; v_used_sum := 0;
    v_attendance_used := v_shifts_scheduled > 0;
    IF v_attendance_used THEN
      v_attendance_score := (v_shifts_worked::NUMERIC / v_shifts_scheduled) * 100;
      v_used_count := v_used_count + 1; v_used_sum := v_used_sum + v_attendance_score;
    ELSE v_attendance_score := 0; END IF;

    v_punctuality_used := v_shifts_worked > 0;
    v_late_deduction := LEAST(v_late_count * 5, 100);
    v_late_min_deduction := LEAST(FLOOR(v_total_late_minutes::NUMERIC / 10), 50);
    v_punctuality_score := GREATEST(0, 100 - v_late_deduction - v_late_min_deduction);
    IF v_punctuality_used THEN
      v_used_count := v_used_count + 1; v_used_sum := v_used_sum + v_punctuality_score;
    ELSE v_punctuality_score := 0; END IF;

    v_task_used := v_tasks_assigned > 0;
    IF v_task_used THEN
      v_task_score := LEAST(100, (v_tasks_completed_on_time::NUMERIC / v_tasks_assigned) * 100);
      v_used_count := v_used_count + 1; v_used_sum := v_used_sum + v_task_score;
    ELSE v_task_score := 0; END IF;

    v_test_used := v_tests_taken > 0;
    IF v_test_used THEN
      v_test_score := v_avg_test_score;
      v_used_count := v_used_count + 1; v_used_sum := v_used_sum + v_test_score;
    ELSE v_test_score := 0; END IF;

    v_review_used := v_reviews_count > 0;
    IF v_review_used THEN
      v_review_score := v_avg_review_score;
      v_used_count := v_used_count + 1; v_used_sum := v_used_sum + v_review_score;
    ELSE v_review_score := 0; END IF;

    IF v_used_count > 0 THEN v_base_score := v_used_sum / v_used_count;
    ELSE v_base_score := 0; END IF;

    -- WARNINGS
    v_warning_penalty := 0; v_warning_count := 0;
    SELECT COUNT(*), COALESCE(SUM(
      CASE WHEN COALESCE((se.metadata->>'severity'), 'minor') = 'major' THEN 10 ELSE 5 END
      * GREATEST(0, 1.0 - (v_today - se.event_date::date)::numeric / 90)
    ), 0)
    INTO v_warning_count, v_warning_penalty
    FROM staff_events se
    WHERE se.staff_id = v_emp.id AND se.event_type = 'warning' AND se.event_date >= v_ninety_days_ago;

    v_overall_score := GREATEST(0, LEAST(100, v_base_score - v_warning_penalty));

    RETURN QUERY SELECT v_emp.id, v_emp.full_name, v_emp.role, p_location_id, v_loc_name, v_emp.avatar_url,
      v_attendance_score, v_punctuality_score, v_task_score, v_test_score, v_review_score,
      v_base_score, v_warning_penalty, v_warning_count, v_overall_score,
      v_shifts_scheduled, v_shifts_worked, v_shifts_missed, v_late_count, v_total_late_minutes,
      v_tasks_assigned, v_tasks_completed, v_tasks_completed_on_time, v_tasks_overdue,
      v_tests_taken, v_tests_passed, v_avg_test_score, v_reviews_count, v_avg_review_score;
  END LOOP;
END;
$function$;
