import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay } from "date-fns";
import { useEffect } from "react";

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
  // Overall score (0-100)
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

      // Get tasks for the period
      let tasksQuery = supabase
        .from("tasks")
        .select("id, assigned_to, status, completed_at, completed_late, due_at")
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .not("assigned_to", "is", null);

      const { data: tasks, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;

      // Get test submissions for the period
      const { data: testSubmissions, error: testError } = await supabase
        .from("test_submissions")
        .select("id, employee_id, score, passed, completed_at")
        .gte("completed_at", `${startDate}T00:00:00`)
        .lte("completed_at", `${endDate}T23:59:59`)
        .not("employee_id", "is", null);

      if (testError) throw testError;

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

        // Calculate task metrics
        const employeeTasks = (tasks || []).filter(
          (task) => task.assigned_to === employeeId
        );
        const tasksAssigned = employeeTasks.length;
        const tasksCompleted = employeeTasks.filter(
          (t) => t.status === "completed"
        ).length;
        const tasksCompletedOnTime = employeeTasks.filter(
          (t) => t.status === "completed" && !t.completed_late
        ).length;
        const tasksOverdue = employeeTasks.filter(
          (t) => t.status !== "completed" && t.due_at && new Date(t.due_at) < new Date()
        ).length;

        // Calculate test metrics
        const employeeTests = (testSubmissions || []).filter(
          (sub) => sub.employee_id === employeeId
        );
        const testsTaken = employeeTests.length;
        const testsPassed = employeeTests.filter((t) => t.passed).length;
        const averageTestScore = testsTaken > 0
          ? Math.round(employeeTests.reduce((sum, t) => sum + (t.score || 0), 0) / testsTaken)
          : 0;

        // Calculate component scores (0-100)
        // Attendance score: % of scheduled shifts worked
        const attendanceScore =
          shiftsScheduled > 0
            ? Math.round((shiftsWithAttendance / shiftsScheduled) * 100)
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
            ? Math.round((tasksCompletedOnTime / tasksAssigned) * 100)
            : 100; // Perfect score if no tasks assigned

        // Test score: Average test score if tests taken, otherwise neutral (doesn't hurt)
        const testScore = testsTaken > 0 ? averageTestScore : 100;

        // Overall score: Equal weight (25% each)
        const overallScore = Math.round(
          (attendanceScore + punctualityScore + taskScore + testScore) / 4
        );

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