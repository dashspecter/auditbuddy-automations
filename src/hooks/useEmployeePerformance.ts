import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, format } from "date-fns";
import { useEffect } from "react";
import { calculateWarningPenalty, WarningMetadata, Warning, WarningContribution } from "./useWarningPenalty";

export interface EmployeePerformanceScore {
  employee_id: string;
  employee_name: string;
  role: string;
  location_id: string;
  location_name: string;
  avatar_url: string | null;
  // Component scores (0-100)
  attendance_score: number;
  punctuality_score: number;
  task_score: number;
  test_score: number;
  performance_review_score: number;
  // Base score before warning deductions
  base_score: number;
  // Warning penalty
  warning_penalty: number;
  warning_count: number;
  warning_contributions: WarningContribution[];
  warning_monthly_caps: Record<string, { raw: number; capped: number }>;
  // Overall score (0-100) - Base minus warning penalty
  overall_score: number;
  // Raw metrics
  shifts_scheduled: number;
  shifts_worked: number;
  shifts_missed: number;
  late_count: number;
  total_late_minutes: number;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_completed_on_time: number;
  tasks_overdue: number;
  // Test metrics
  tests_taken: number;
  tests_passed: number;
  average_test_score: number;
  // Performance review metrics
  reviews_count: number;
  average_review_score: number;
}

export const useEmployeePerformance = (
  startDate?: string,
  endDate?: string,
  locationId?: string
) => {
  const queryClient = useQueryClient();

  // Set up realtime subscriptions for performance-related tables
  useEffect(() => {
    if (!startDate || !endDate) return;

    const channels = [
      supabase
        .channel('attendance_logs_performance')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_logs' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['employee-performance'] });
          }
        )
        .subscribe(),
      supabase
        .channel('tasks_performance')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['employee-performance'] });
          }
        )
        .subscribe(),
      supabase
        .channel('test_submissions_performance')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'test_submissions' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['employee-performance'] });
          }
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [startDate, endDate, queryClient]);

  return useQuery({
    queryKey: ["employee-performance", startDate, endDate, locationId],
    queryFn: async () => {
      if (!startDate || !endDate) return [];

      const today = startOfDay(new Date());

      // Get employees with their locations
      let employeesQuery = supabase
        .from("employees")
        .select(`
          id,
          full_name,
          role,
          avatar_url,
          location_id,
          locations(id, name)
        `)
        .eq("status", "active");

      if (locationId) {
        employeesQuery = employeesQuery.eq("location_id", locationId);
      }

      const { data: employees, error: employeesError } = await employeesQuery;
      if (employeesError) throw employeesError;

      // Get shifts and assignments for the period
      let shiftsQuery = supabase
        .from("shifts")
        .select(`
          id,
          shift_date,
          start_time,
          location_id,
          locations(requires_checkin),
          shift_assignments!inner(
            id,
            staff_id,
            approval_status
          )
        `)
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .eq("shift_assignments.approval_status", "approved");

      if (locationId) {
        shiftsQuery = shiftsQuery.eq("location_id", locationId);
      }

      const { data: shifts, error: shiftsError } = await shiftsQuery;
      if (shiftsError) throw shiftsError;

      // Get attendance logs for the period
      const { data: attendanceLogs, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select("*")
        .gte("check_in_at", `${startDate}T00:00:00`)
        .lte("check_in_at", `${endDate}T23:59:59`);

      if (attendanceError) throw attendanceError;

      // Get tasks for the period (directly assigned)
      let tasksQuery = supabase
        .from("tasks")
        .select("id, assigned_to, status, completed_at, completed_late, due_at")
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .not("assigned_to", "is", null);

      const { data: tasks, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;

      // Get task_completions for the period (includes role/location-based task completions)
      const { data: taskCompletions, error: taskCompletionsError } = await supabase
        .from("task_completions")
        .select("id, task_id, completed_by_employee_id, completed_at, occurrence_date, completed_late")
        .gte("occurrence_date", startDate)
        .lte("occurrence_date", endDate)
        .not("completed_by_employee_id", "is", null);

      if (taskCompletionsError) throw taskCompletionsError;

      // Build a map of task details for looking up due_at / completed_late
      // Fetch parent tasks for completions that aren't already in the tasks list
      const completionTaskIds = [...new Set((taskCompletions || []).map(c => c.task_id))];
      const existingTaskIds = new Set((tasks || []).map(t => t.id));
      const missingTaskIds = completionTaskIds.filter(id => !existingTaskIds.has(id));
      
      let extraTasks: typeof tasks = [];
      if (missingTaskIds.length > 0) {
        // Fetch in batches of 100 to avoid URL length limits
        for (let i = 0; i < missingTaskIds.length; i += 100) {
          const batch = missingTaskIds.slice(i, i + 100);
          const { data: batchTasks, error: batchError } = await supabase
            .from("tasks")
            .select("id, assigned_to, status, completed_at, completed_late, due_at")
            .in("id", batch);
          if (batchError) throw batchError;
          if (batchTasks) extraTasks = [...extraTasks!, ...batchTasks];
        }
      }

      // Combined task lookup map
      const allTasksMap = new Map<string, { due_at: string | null; completed_late: boolean | null }>();
      for (const t of [...(tasks || []), ...(extraTasks || [])]) {
        allTasksMap.set(t.id, { due_at: t.due_at, completed_late: t.completed_late });
      }

      // Get test submissions for the period
      const { data: testSubmissions, error: testError } = await supabase
        .from("test_submissions")
        .select("id, employee_id, score, passed, completed_at")
        .gte("completed_at", `${startDate}T00:00:00`)
        .lte("completed_at", `${endDate}T23:59:59`)
        .not("employee_id", "is", null);

      if (testError) throw testError;

      // Get staff audits (performance reviews) for the period
      const { data: staffAudits, error: auditsError } = await supabase
        .from("staff_audits")
        .select("id, employee_id, score, audit_date")
        .gte("audit_date", startDate)
        .lte("audit_date", endDate)
        .not("employee_id", "is", null);

      if (auditsError) throw auditsError;

      // Get warnings for all employees (last 90 days for penalty calculation)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data: warningsData, error: warningsError } = await supabase
        .from("staff_events")
        .select("id, staff_id, event_date, metadata")
        .eq("event_type", "warning")
        .gte("event_date", format(ninetyDaysAgo, 'yyyy-MM-dd'));

      if (warningsError) throw warningsError;

      // Group warnings by employee
      const warningsByEmployee: Record<string, Warning[]> = {};
      for (const event of warningsData || []) {
        const staffId = event.staff_id;
        if (!warningsByEmployee[staffId]) {
          warningsByEmployee[staffId] = [];
        }
        warningsByEmployee[staffId].push({
          id: event.id,
          staff_id: event.staff_id,
          event_date: event.event_date,
          metadata: event.metadata as WarningMetadata | null,
        });
      }

      // Calculate performance for each employee
      const performanceScores: EmployeePerformanceScore[] = [];

      for (const employee of employees || []) {
        const locationData = employee.locations as any;
        const employeeId = employee.id;

        // Count shifts for this employee
        const employeeShifts = (shifts || []).filter((shift) =>
          shift.shift_assignments?.some((sa: any) => sa.staff_id === employeeId)
        );

        // Only count past shifts for attendance calculation
        const pastShifts = employeeShifts.filter(
          (s) => startOfDay(new Date(s.shift_date)) <= today
        );

        // Get attendance for this employee
        const employeeAttendance = (attendanceLogs || []).filter(
          (log) => log.staff_id === employeeId
        );

        // Calculate attendance metrics
        const shiftsScheduled = pastShifts.length;
        const shiftsWithAttendance = pastShifts.filter((shift) => {
          const hasAttendance = employeeAttendance.some(
            (log) => log.shift_id === shift.id
          );
          const requiresCheckin = (shift.locations as any)?.requires_checkin;
          // If check-in not required, assume worked
          return hasAttendance || !requiresCheckin;
        }).length;

        const shiftsMissed = pastShifts.filter((shift) => {
          const requiresCheckin = (shift.locations as any)?.requires_checkin;
          const hasAttendance = employeeAttendance.some(
            (log) => log.shift_id === shift.id
          );
          return requiresCheckin && !hasAttendance;
        }).length;

        // Calculate punctuality metrics
        const lateAttendance = employeeAttendance.filter((log) => log.is_late);
        const lateCount = lateAttendance.length;
        const totalLateMinutes = lateAttendance.reduce(
          (sum, log) => sum + (log.late_minutes || 0),
          0
        );

        // Calculate task metrics - merge directly assigned tasks AND task_completions
        const directTasks = (tasks || []).filter(
          (task) => task.assigned_to === employeeId
        );
        const directTaskIds = new Set(directTasks.map(t => t.id));
        
        // Get completions from task_completions for this employee (excluding already-counted direct tasks)
        const employeeCompletions = (taskCompletions || []).filter(
          (c) => c.completed_by_employee_id === employeeId && !directTaskIds.has(c.task_id)
        );
        
        // Direct task metrics
        const directAssigned = directTasks.length;
        const directCompleted = directTasks.filter(t => t.status === "completed").length;
        const directCompletedOnTime = directTasks.filter(
          t => t.status === "completed" && !t.completed_late
        ).length;
        
        // Completion-based metrics (role/location assigned tasks completed by this employee)
        // NOTE: Task late status is now tracked per-completion (task_completions.completed_late)
        // Priority: per-completion flag > parent task flag > due_at comparison
        const completionCount = employeeCompletions.length;
        // Use per-completion completed_late flag; if null/undefined, fall back to parent task data
        const completionOnTimeCount = employeeCompletions.filter(c => {
          // If this completion has the completed_late flag set, use it (preferred, per-occurrence tracking)
          if (c.completed_late === true) return false;
          if (c.completed_late === false) return true;
          
          // Fallback to parent task data if per-completion flag not set
          const parentTask = allTasksMap.get(c.task_id);
          if (!parentTask) return true; // If we can't find parent, assume on time
          if (parentTask.completed_late === true) return false;
          if (parentTask.completed_late === false) return true;
          
          // Last fallback: if due_at exists, compare completion time vs due date
          if (parentTask.due_at && c.completed_at) {
            return new Date(c.completed_at) <= new Date(parentTask.due_at);
          }
          return true; // No due date = on time
        }).length;
        
        // Merged totals
        const tasksAssigned = directAssigned + completionCount;
        const tasksCompleted = directCompleted + completionCount; // all completions count as completed
        const tasksCompletedOnTime = directCompletedOnTime + completionOnTimeCount;
        const tasksOverdue = directTasks.filter(
          (t) => t.status !== "completed" && t.due_at && new Date(t.due_at) < new Date()
        ).length;

        // Calculate test metrics
        const employeeTests = (testSubmissions || []).filter(
          (sub) => sub.employee_id === employeeId
        );
        const testsTaken = employeeTests.length;
        const testsPassed = employeeTests.filter((t) => t.passed).length;
        const averageTestScore = testsTaken > 0
          ? employeeTests.reduce((sum, t) => sum + (t.score || 0), 0) / testsTaken
          : 0;

        // Calculate performance review metrics (staff audits)
        const employeeReviews = (staffAudits || []).filter(
          (audit) => audit.employee_id === employeeId
        );
        const reviewsCount = employeeReviews.length;
        const averageReviewScore = reviewsCount > 0
          ? employeeReviews.reduce((sum, r) => sum + (r.score || 0), 0) / reviewsCount
          : 0;

        // Calculate component scores (0-100)
        // Attendance score: % of scheduled shifts worked
        const attendanceScore =
          shiftsScheduled > 0
            ? (shiftsWithAttendance / shiftsScheduled) * 100
            : 100; // Perfect score if no shifts scheduled

        // Punctuality score: Deduct points for lateness
        // Start at 100, deduct 5 points per late arrival (max 100 deduction)
        const lateDeduction = Math.min(lateCount * 5, 100);
        // Also deduct based on late minutes (1 point per 10 minutes, max 50)
        const lateMinutesDeduction = Math.min(Math.floor(totalLateMinutes / 10), 50);
        const punctualityScore = Math.max(
          0,
          100 - lateDeduction - lateMinutesDeduction
        );

        // Task score: % of assigned tasks completed on time
        const taskScore =
          tasksAssigned > 0
            ? (tasksCompletedOnTime / tasksAssigned) * 100
            : 100; // Perfect score if no tasks assigned

        // Test score: Average test score if tests taken, otherwise neutral
        const testScore = testsTaken > 0 ? averageTestScore : 100;

        // Performance review score: Average review score if reviews exist, otherwise neutral
        const performanceReviewScore = reviewsCount > 0 ? averageReviewScore : 100;

        // Base score: Equal weight (20% each for 5 components)
        const baseScore =
          (attendanceScore + punctualityScore + taskScore + testScore + performanceReviewScore) / 5;

        // Calculate warning penalty for this employee
        const employeeWarnings = warningsByEmployee[employeeId] || [];
        const warningPenaltyResult = calculateWarningPenalty(employeeWarnings);
        
        // Final score: Base minus warning penalty, clamped to 0-100
        const overallScore = Math.max(0, Math.min(100, baseScore - warningPenaltyResult.totalPenalty));

        performanceScores.push({
          employee_id: employeeId,
          employee_name: employee.full_name,
          role: employee.role,
          location_id: employee.location_id,
          location_name: locationData?.name || "Unknown",
          avatar_url: employee.avatar_url,
          attendance_score: attendanceScore,
          punctuality_score: punctualityScore,
          task_score: taskScore,
          test_score: testScore,
          performance_review_score: performanceReviewScore,
          base_score: baseScore,
          warning_penalty: warningPenaltyResult.totalPenalty,
          warning_count: warningPenaltyResult.warningCount,
          warning_contributions: warningPenaltyResult.contributions,
          warning_monthly_caps: warningPenaltyResult.monthlyPenalties,
          overall_score: overallScore,
          shifts_scheduled: shiftsScheduled,
          shifts_worked: shiftsWithAttendance,
          shifts_missed: shiftsMissed,
          late_count: lateCount,
          total_late_minutes: totalLateMinutes,
          tasks_assigned: tasksAssigned,
          tasks_completed: tasksCompleted,
          tasks_completed_on_time: tasksCompletedOnTime,
          tasks_overdue: tasksOverdue,
          tests_taken: testsTaken,
          tests_passed: testsPassed,
          average_test_score: averageTestScore,
          reviews_count: reviewsCount,
          average_review_score: averageReviewScore,
        });
      }

      // Sort by overall score descending
      performanceScores.sort((a, b) => b.overall_score - a.overall_score);

      return performanceScores;
    },
    enabled: !!startDate && !!endDate,
  });
};

// Get leaderboard (top performers)
export const usePerformanceLeaderboard = (
  startDate?: string,
  endDate?: string,
  locationId?: string,
  limit: number = 10
) => {
  const { data: allScores = [], isLoading } = useEmployeePerformance(
    startDate,
    endDate,
    locationId
  );

  const leaderboard = allScores.slice(0, limit);
  
  // Group by location for location-specific leaderboards
  const byLocation = allScores.reduce((acc, score) => {
    if (!acc[score.location_id]) {
      acc[score.location_id] = {
        location_id: score.location_id,
        location_name: score.location_name,
        employees: [],
      };
    }
    acc[score.location_id].employees.push(score);
    return acc;
  }, {} as Record<string, { location_id: string; location_name: string; employees: EmployeePerformanceScore[] }>);

  return {
    leaderboard,
    byLocation: Object.values(byLocation),
    allScores,
    isLoading,
  };
};