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
SET search_path = public
AS $$
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

    SELECT COUNT(*), COALESCE(SUM(al.late_minutes), 0)
    INTO v_late_count, v_total_late_minutes
    FROM attendance_logs al
    WHERE al.staff_id = v_emp.id
      AND al.check_in_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND al.check_in_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC')
      AND al.is_late = true
      AND NOT EXISTS (
        SELECT 1 FROM workforce_exceptions we
        WHERE we.attendance_id = al.id
          AND we.exception_type = 'late_start'
          AND we.status = 'approved'
      );

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
            (t.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr2 WHERE tr2.task_id = t.id))
            OR EXISTS (SELECT 1 FROM employee_roles er WHERE er.id = t.assigned_role_id
                       AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role)
            OR EXISTS (SELECT 1 FROM task_roles tr JOIN employee_roles er ON er.id = tr.role_id
                       WHERE tr.task_id = t.id
                       AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = v_emp_normalized_role)
          )
      LOOP
        v_task_occurs := false;
        IF v_task_rec.recurrence_type IS NULL OR v_task_rec.recurrence_type = 'none' THEN
          IF v_task_rec.task_created_at::date = v_shift_day.shift_date THEN v_task_occurs := true; END IF;
        ELSIF v_task_rec.recurrence_type = 'daily' THEN
          IF v_shift_day.shift_date >= v_task_rec.task_created_at::date
            AND (v_task_rec.recurrence_end_date IS NULL OR v_shift_day.shift_date <= v_task_rec.recurrence_end_date) THEN
            v_task_occurs := true;
          END IF;
        ELSIF v_task_rec.recurrence_type = 'weekly' THEN
          IF v_task_rec.recurrence_days_of_week IS NOT NULL 
            AND EXTRACT(DOW FROM v_shift_day.shift_date)::int = ANY(v_task_rec.recurrence_days_of_week)
            AND v_shift_day.shift_date >= v_task_rec.task_created_at::date
            AND (v_task_rec.recurrence_end_date IS NULL OR v_shift_day.shift_date <= v_task_rec.recurrence_end_date) THEN
            v_task_occurs := true;
          END IF;
        END IF;

        IF v_task_occurs THEN
          v_time_slots := COALESCE(v_task_rec.recurrence_times, ARRAY[]::TEXT[]);
          IF array_length(v_time_slots, 1) IS NULL OR array_length(v_time_slots, 1) = 0 THEN
            IF v_task_rec.start_at IS NOT NULL THEN
              v_time_slots := ARRAY[v_task_rec.start_at::time::text];
            ELSE
              v_time_slots := ARRAY['00:00:00'];
            END IF;
          END IF;

          FOREACH v_time_slot IN ARRAY v_time_slots
          LOOP
            v_task_time := v_time_slot::time;
            IF v_task_time >= v_shift_day.emp_shift_start AND v_task_time < v_shift_day.emp_shift_end THEN
              SELECT COUNT(*) INTO v_eligible_count
              FROM (
                SELECT DISTINCT sa2.staff_id
                FROM shift_assignments sa2
                JOIN shifts s2 ON s2.id = sa2.shift_id
                WHERE s2.location_id = p_location_id
                  AND s2.shift_date = v_shift_day.shift_date
                  AND sa2.approval_status = 'approved'
                  AND v_task_time >= s2.start_time AND v_task_time < s2.end_time
                  AND (
                    (v_task_rec.assigned_role_id IS NULL AND NOT EXISTS (SELECT 1 FROM task_roles tr3 WHERE tr3.task_id = v_task_rec.id))
                    OR EXISTS (
                      SELECT 1 FROM employees e2
                      WHERE e2.id = sa2.staff_id
                      AND (
                        EXISTS (SELECT 1 FROM employee_roles er WHERE er.id = v_task_rec.assigned_role_id
                                AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = lower(trim(translate(e2.role, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))))
                        OR EXISTS (SELECT 1 FROM task_roles tr JOIN employee_roles er ON er.id = tr.role_id
                                   WHERE tr.task_id = v_task_rec.id
                                   AND lower(trim(translate(er.name, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))) = lower(trim(translate(e2.role, 'ăâîșțĂÂÎȘȚ', 'aaistsAIST'))))
                      )
                    )
                  )
              ) eligible;

              IF v_eligible_count > 0 THEN
                v_fair_share_total := v_fair_share_total + (1.0 / v_eligible_count);

                SELECT COUNT(*) INTO v_completion_count
                FROM task_completions tc
                WHERE tc.task_id = v_task_rec.id
                  AND tc.completed_by_employee_id = v_emp.id
                  AND tc.occurrence_date = v_shift_day.shift_date
                  AND (v_time_slot = '00:00:00' OR tc.scheduled_time = v_time_slot);

                IF v_completion_count > 0 THEN
                  v_individual_fair_share := (1.0 / v_eligible_count);
                  v_fair_share_total := v_fair_share_total;
                END IF;
              END IF;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;

    v_individual_tasks_assigned := 0;
    v_individual_tasks_completed := 0;
    v_individual_tasks_completed_on_time := 0;
    FOR v_shift_day IN
      SELECT DISTINCT s.shift_date
      FROM shifts s
      INNER JOIN shift_assignments sa ON sa.shift_id = s.id
      WHERE sa.staff_id = v_emp.id AND s.location_id = p_location_id
        AND s.shift_date >= p_start_date AND s.shift_date <= p_end_date AND s.shift_date <= v_today
        AND sa.approval_status = 'approved'
    LOOP
      FOR v_task_rec IN
        SELECT t.id, t.recurrence_type, t.created_at AS task_created_at,
               t.recurrence_interval, t.recurrence_days_of_week, t.recurrence_end_date,
               t.recurrence_times, t.start_at, t.assigned_role_id
        FROM tasks t
        LEFT JOIN task_locations tl ON tl.task_id = t.id
        WHERE t.assigned_to IS NULL
          AND t.is_individual = true
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
        v_task_occurs := false;
        IF v_task_rec.recurrence_type IS NULL OR v_task_rec.recurrence_type = 'none' THEN
          IF v_task_rec.task_created_at::date = v_shift_day.shift_date THEN v_task_occurs := true; END IF;
        ELSIF v_task_rec.recurrence_type = 'daily' THEN
          IF v_shift_day.shift_date >= v_task_rec.task_created_at::date
            AND (v_task_rec.recurrence_end_date IS NULL OR v_shift_day.shift_date <= v_task_rec.recurrence_end_date) THEN
            v_task_occurs := true;
          END IF;
        ELSIF v_task_rec.recurrence_type = 'weekly' THEN
          IF v_task_rec.recurrence_days_of_week IS NOT NULL 
            AND EXTRACT(DOW FROM v_shift_day.shift_date)::int = ANY(v_task_rec.recurrence_days_of_week)
            AND v_shift_day.shift_date >= v_task_rec.task_created_at::date
            AND (v_task_rec.recurrence_end_date IS NULL OR v_shift_day.shift_date <= v_task_rec.recurrence_end_date) THEN
            v_task_occurs := true;
          END IF;
        END IF;

        IF v_task_occurs THEN
          v_time_slots := COALESCE(v_task_rec.recurrence_times, ARRAY[]::TEXT[]);
          IF array_length(v_time_slots, 1) IS NULL OR array_length(v_time_slots, 1) = 0 THEN
            IF v_task_rec.start_at IS NOT NULL THEN
              v_time_slots := ARRAY[v_task_rec.start_at::time::text];
            ELSE
              v_time_slots := ARRAY['00:00:00'];
            END IF;
          END IF;

          FOREACH v_time_slot IN ARRAY v_time_slots
          LOOP
            v_individual_tasks_assigned := v_individual_tasks_assigned + 1;
            SELECT COUNT(*) INTO v_completion_count
            FROM task_completions tc
            WHERE tc.task_id = v_task_rec.id AND tc.completed_by_employee_id = v_emp.id
              AND tc.occurrence_date = v_shift_day.shift_date
              AND (v_time_slot = '00:00:00' OR tc.scheduled_time = v_time_slot);
            IF v_completion_count > 0 THEN
              v_individual_tasks_completed := v_individual_tasks_completed + 1;
              v_individual_tasks_completed_on_time := v_individual_tasks_completed_on_time + 1;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;

    v_shared_tasks_assigned := CEIL(v_fair_share_total);
    
    SELECT COUNT(*), COUNT(*) FILTER (WHERE true)
    INTO v_completion_count, v_completion_on_time_count
    FROM task_completions tc
    JOIN tasks t ON t.id = tc.task_id
    LEFT JOIN task_locations tl ON tl.task_id = t.id
    WHERE tc.completed_by_employee_id = v_emp.id
      AND tc.occurrence_date >= p_start_date AND tc.occurrence_date <= p_end_date
      AND t.assigned_to IS NULL
      AND COALESCE(t.is_individual, false) = false
      AND (t.location_id = p_location_id OR tl.location_id = p_location_id);

    v_tasks_assigned := v_direct_assigned + v_shared_tasks_assigned + v_individual_tasks_assigned;
    v_tasks_completed := v_direct_completed + v_completion_count + v_individual_tasks_completed;
    v_tasks_completed_on_time := v_direct_completed_on_time + v_completion_on_time_count + v_individual_tasks_completed_on_time;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE te.passed = true), 
      COALESCE(AVG(te.score), 0)
    INTO v_tests_taken, v_tests_passed, v_avg_test_score
    FROM test_submissions te
    WHERE te.employee_id = v_emp.id
      AND te.completed_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND te.completed_at <= ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC');

    -- performance_reviews table may not exist yet; gracefully default to 0
    BEGIN
      SELECT COUNT(*), COALESCE(AVG(pr.overall_score), 0)
      INTO v_reviews_count, v_avg_review_score
      FROM performance_reviews pr
      WHERE pr.employee_id = v_emp.id
        AND pr.review_date >= p_start_date AND pr.review_date <= p_end_date;
    EXCEPTION WHEN undefined_table THEN
      v_reviews_count := 0;
      v_avg_review_score := 0;
    END;

    IF v_shifts_scheduled > 0 THEN
      v_attendance_score := LEAST(100, ROUND((v_shifts_worked::NUMERIC / v_shifts_scheduled) * 100, 1));
      v_attendance_used := true;
    ELSE
      v_attendance_score := 0;
      v_attendance_used := false;
    END IF;

    IF v_shifts_worked > 0 THEN
      v_late_deduction := v_late_count * 5;
      v_late_min_deduction := LEAST(v_total_late_minutes * 0.1, 30);
      v_punctuality_score := GREATEST(0, 100 - v_late_deduction - v_late_min_deduction);
      v_punctuality_used := true;
    ELSE
      v_punctuality_score := 0;
      v_punctuality_used := false;
    END IF;

    IF v_tasks_assigned > 0 THEN
      v_task_score := LEAST(100, ROUND((v_tasks_completed::NUMERIC / v_tasks_assigned) * 100, 1));
      v_task_used := true;
    ELSE
      v_task_score := 0;
      v_task_used := false;
    END IF;

    IF v_tests_taken > 0 THEN
      v_test_score := ROUND(v_avg_test_score, 1);
      v_test_used := true;
    ELSE
      v_test_score := 0;
      v_test_used := false;
    END IF;

    IF v_reviews_count > 0 THEN
      v_review_score := ROUND((v_avg_review_score / 5.0) * 100, 1);
      v_review_used := true;
    ELSE
      v_review_score := 0;
      v_review_used := false;
    END IF;

    v_used_count := 0;
    v_used_sum := 0;
    IF v_attendance_used THEN v_used_count := v_used_count + 1; v_used_sum := v_used_sum + v_attendance_score; END IF;
    IF v_punctuality_used THEN v_used_count := v_used_count + 1; v_used_sum := v_used_sum + v_punctuality_score; END IF;
    IF v_task_used THEN v_used_count := v_used_count + 1; v_used_sum := v_used_sum + v_task_score; END IF;
    IF v_test_used THEN v_used_count := v_used_count + 1; v_used_sum := v_used_sum + v_test_score; END IF;
    IF v_review_used THEN v_used_count := v_used_count + 1; v_used_sum := v_used_sum + v_review_score; END IF;

    IF v_used_count > 0 THEN
      v_base_score := ROUND(v_used_sum / v_used_count, 1);
    ELSE
      v_base_score := 0;
    END IF;

    -- warnings table may not exist yet; gracefully default to 0
    BEGIN
      SELECT COUNT(*) INTO v_warning_count
      FROM warnings w
      WHERE w.employee_id = v_emp.id
        AND w.issued_at >= v_ninety_days_ago
        AND w.status = 'active';
    EXCEPTION WHEN undefined_table THEN
      v_warning_count := 0;
    END;

    v_warning_penalty := v_warning_count * 5;
    v_overall_score := GREATEST(0, v_base_score - v_warning_penalty);

    RETURN QUERY SELECT
      v_emp.id, v_emp.full_name, v_emp.role, v_emp.location_id, v_loc_name,
      v_emp.avatar_url,
      v_attendance_score, v_punctuality_score, v_task_score, v_test_score, v_review_score,
      v_base_score, v_warning_penalty, v_warning_count, v_overall_score,
      v_shifts_scheduled, v_shifts_worked, v_shifts_missed,
      v_late_count, v_total_late_minutes,
      v_tasks_assigned, v_tasks_completed, v_tasks_completed_on_time, v_tasks_overdue,
      v_tests_taken, v_tests_passed, v_avg_test_score,
      v_reviews_count, v_avg_review_score;
  END LOOP;
END;
$$;