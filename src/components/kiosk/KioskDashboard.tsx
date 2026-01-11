import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInMinutes, differenceInSeconds, isPast } from "date-fns";
import { getOccurrencesForDate, getOriginalTaskId } from "@/lib/taskOccurrenceEngine";
import type { Task as BaseTask } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  ListTodo,
  Trophy,
  XCircle,
  Timer,
  AlertTriangle
} from "lucide-react";
import { 
  computeKioskTaskMetrics, 
  getTodaysChampions, 
  getWeeklyStars,
  type KioskEmployeeTaskMetrics,
  type KioskTask,
  type ScheduledEmployee
} from "@/lib/kioskTaskAttribution";

interface KioskDashboardProps {
  locationId: string;
  companyId: string;
}

interface Employee {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  user_id: string | null;
}

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  shift_assignments: { staff_id: string }[];
}

interface AttendanceLog {
  id: string;
  staff_id: string;
  check_in_at: string;
  check_out_at: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assigned_to: string | null;
  priority: string;
  start_at: string | null;
  due_at: string | null;
  role_ids?: string[];
  role_names?: string[];
}

export const KioskDashboard = ({ locationId, companyId }: KioskDashboardProps) => {
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString();

  // Fetch employees at this location
  const { data: employees = [] } = useQuery({
    queryKey: ["kiosk-employees", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, avatar_url, role, user_id")
        .eq("location_id", locationId)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data as Employee[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch today's attendance
  const { data: attendance = [] } = useQuery({
    queryKey: ["kiosk-attendance", locationId, format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("id, staff_id, check_in_at, check_out_at")
        .eq("location_id", locationId)
        .gte("check_in_at", todayStart)
        .lte("check_in_at", todayEnd);
      if (error) throw error;
      return data as AttendanceLog[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch today's shifts at this location
  const { data: shifts = [] } = useQuery({
    queryKey: ["kiosk-shifts", locationId, format(today, "yyyy-MM-dd")],
    queryFn: async (): Promise<Shift[]> => {
      const todayStr = format(today, "yyyy-MM-dd");
      
      // Get shifts for this location and date
      const { data: shiftsList, error: shiftsError } = await (supabase
        .from("shifts") as any)
        .select("id, start_time, end_time")
        .eq("location_id", locationId)
        .eq("shift_date", todayStr);
      if (shiftsError) throw shiftsError;
      if (!shiftsList?.length) return [];
      
      // Get assignments for those shifts
      const shiftIds = shiftsList.map((s: any) => s.id);
      const { data: assignments, error: assignError } = await (supabase
        .from("shift_assignments") as any)
        .select("shift_id, staff_id")
        .in("shift_id", shiftIds);
      if (assignError) throw assignError;
      
      // Combine
      return shiftsList.map((shift: any) => ({
        ...shift,
        shift_assignments: (assignments || []).filter((a: any) => a.shift_id === shift.id)
      }));
    },
    refetchInterval: 60000,
  });

  // Fetch ALL tasks for this location (we'll filter by occurrence engine)
  const { data: rawTasks = [] } = useQuery({
    queryKey: ["kiosk-raw-tasks", locationId],
    queryFn: async () => {
      // Get task IDs from task_locations table
      const { data: taskLocations, error: tlError } = await supabase
        .from("task_locations")
        .select("task_id")
        .eq("location_id", locationId);

      if (tlError) throw tlError;
      
      const taskIdsFromLocations = (taskLocations || []).map((tl) => tl.task_id);

      // Also get tasks that have location_id directly set
      const { data: directTasks, error: directError } = await (supabase
        .from("tasks") as any)
        .select("id")
        .eq("location_id", locationId);
      
      if (directError) throw directError;
      
      const taskIdsFromDirect = (directTasks || []).map((t: any) => t.id);
      
      // Combine both sources and deduplicate
      const allTaskIds = [...new Set([...taskIdsFromLocations, ...taskIdsFromDirect])];
      
      if (!allTaskIds.length) return [];

      // Get ALL tasks for this location with assigned_role (no date filtering - occurrence engine will handle it)
      const { data, error } = await (supabase
        .from("tasks") as any)
        .select("id, title, status, assigned_to, assigned_role_id, priority, start_at, due_at, recurrence_type, recurrence_interval, recurrence_end_date, duration_minutes, completed_at, completed_by, completed_late")
        .in("id", allTaskIds);

      if (error) throw error;
      if (!data?.length) return [];

      // Get role assignments from task_roles table (for multi-role support)
      const { data: taskRoles, error: trError } = await supabase
        .from("task_roles")
        .select("task_id, role_id")
        .in("task_id", data.map((t: any) => t.id));

      if (trError) throw trError;

      // Collect all role IDs from both sources (task_roles table AND direct assigned_role_id)
      const directRoleIds = data.map((t: any) => t.assigned_role_id).filter(Boolean);
      const taskRoleIds = (taskRoles || []).map((tr: any) => tr.role_id);
      const allRoleIds = [...new Set([...directRoleIds, ...taskRoleIds])];
      
      let roleMap: Record<string, string> = {};
      
      if (allRoleIds.length > 0) {
        const { data: roles, error: rolesError } = await supabase
          .from("employee_roles")
          .select("id, name")
          .in("id", allRoleIds);
        
        if (!rolesError && roles) {
          roleMap = Object.fromEntries(roles.map((r: any) => [r.id, r.name]));
        }
      }

      // Attach role info to tasks - check BOTH task_roles table AND direct assigned_role_id
      return data.map((task: any) => {
        const taskRoleEntries = (taskRoles || []).filter((tr: any) => tr.task_id === task.id);
        
        // If task has entries in task_roles table, use those
        if (taskRoleEntries.length > 0) {
          return {
            ...task,
            role_ids: taskRoleEntries.map((tr: any) => tr.role_id),
            role_names: taskRoleEntries.map((tr: any) => roleMap[tr.role_id]).filter(Boolean)
          };
        }
        
        // Otherwise, fall back to direct assigned_role_id on the task
        if (task.assigned_role_id && roleMap[task.assigned_role_id]) {
          return {
            ...task,
            role_ids: [task.assigned_role_id],
            role_names: [roleMap[task.assigned_role_id]]
          };
        }
        
        // No role assigned
        return {
          ...task,
          role_ids: [],
          role_names: []
        };
      }) as (BaseTask & { role_ids?: string[]; role_names?: string[] })[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Apply occurrence engine to get today's tasks (handles recurring tasks)
  const tasks: Task[] = useMemo(() => {
    const todayOccurrences = getOccurrencesForDate(rawTasks, today, {
      includeCompleted: true,
      includeVirtual: true,
    });
    
    // Re-attach role info from rawTasks (since occurrence engine strips custom fields)
    return todayOccurrences.map(task => {
      const originalId = getOriginalTaskId(task.id);
      const originalTask = rawTasks.find(t => t.id === originalId);
      return {
        ...task,
        role_ids: originalTask?.role_ids || [],
        role_names: originalTask?.role_names || [],
      } as Task;
    });
  }, [rawTasks, today]);

  // Countdown timer state
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Create a map for quick employee lookup by id
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  
  // Create a map for quick employee lookup by user_id (for completed_by lookups)
  const userIdToEmployeeMap = new Map(
    employees.filter(e => e.user_id).map((e) => [e.user_id!, e])
  );

  // Create attendance status map
  const attendanceMap = new Map<string, { checkedIn: boolean; checkedOut: boolean }>();
  attendance.forEach((log) => {
    attendanceMap.set(log.staff_id, {
      checkedIn: true,
      checkedOut: !!log.check_out_at,
    });
  });

  // Create shift map for employees
  const employeeShiftMap = new Map<string, { start: string; end: string }>();
  shifts.forEach((shift) => {
    shift.shift_assignments?.forEach((assignment) => {
      employeeShiftMap.set(assignment.staff_id, {
        start: shift.start_time,
        end: shift.end_time,
      });
    });
  });

  // Filter employees to only those with shifts today
  const todaysTeam = employees.filter((e) => employeeShiftMap.has(e.id));

  // =====================================================
  // KIOSK TASK-BASED LEADERBOARDS (role-aware, overdue-aware)
  // =====================================================
  
  // Build scheduled employees list (Today's Team as ScheduledEmployee format)
  const scheduledEmployeesForMetrics: ScheduledEmployee[] = useMemo(() => {
    return todaysTeam.map(e => ({
      id: e.id,
      full_name: e.full_name,
      role: e.role,
      avatar_url: e.avatar_url,
    }));
  }, [todaysTeam]);

  // Convert tasks to KioskTask format for attribution
  const kioskTasks: KioskTask[] = useMemo(() => {
    return rawTasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      assigned_to: task.assigned_to,
      role_ids: task.role_ids,
      role_names: task.role_names,
      due_at: task.due_at,
      start_at: task.start_at,
      completed_at: task.completed_at,
      completed_late: task.completed_late,
    }));
  }, [rawTasks]);

  // Compute task metrics with proper role attribution
  const employeeTaskMetrics = useMemo(() => {
    return computeKioskTaskMetrics(kioskTasks, scheduledEmployeesForMetrics, today);
  }, [kioskTasks, scheduledEmployeesForMetrics, today]);

  // Today's Champions: ranked by completed_today
  const todaysChampions = useMemo(() => {
    return getTodaysChampions(employeeTaskMetrics, 3);
  }, [employeeTaskMetrics]);

  // Weekly Stars: ranked by weekly_task_score (avoids 100% default problem)
  const weeklyStars = useMemo(() => {
    return getWeeklyStars(employeeTaskMetrics, 3);
  }, [employeeTaskMetrics]);

  const getEmployeeName = (id: string) => employeeMap.get(id)?.full_name || "Unknown";

  const checkedInCount = todaysTeam.filter((e) => {
    const status = attendanceMap.get(e.id);
    return status?.checkedIn && !status?.checkedOut;
  }).length;

  // Group tasks by their assigned roles and find employees on shift with those roles
  // IMPORTANT: Each task only appears ONCE under its PRIMARY role (first assigned role)
  // This matches the main Tasks page behavior where each task is shown once
  const tasksByRole = useMemo(() => {
    const roleGroups: Record<string, { 
      tasks: Task[];
      employees: Employee[];
    }> = {};
    const seenTaskIds = new Set<string>();

    // Get all pending/in-progress tasks
    const pendingTasks = tasks.filter(t => t.status !== "completed");
    
    // Group tasks by their PRIMARY assigned role (first role only to avoid duplicates)
    pendingTasks.forEach(task => {
      // Skip if we've already added this task
      const taskBaseId = getOriginalTaskId(task.id);
      if (seenTaskIds.has(taskBaseId)) return;
      seenTaskIds.add(taskBaseId);
      
      const roleNames = task.role_names || [];
      
      if (roleNames.length === 0) {
        // Unassigned to any role - put in "Unassigned" group
        if (!roleGroups["Unassigned"]) {
          roleGroups["Unassigned"] = { tasks: [], employees: [] };
        }
        roleGroups["Unassigned"].tasks.push(task);
      } else {
        // Add task ONLY to its first/primary assigned role (not all roles)
        const primaryRole = roleNames[0];
        if (!roleGroups[primaryRole]) {
          roleGroups[primaryRole] = { tasks: [], employees: [] };
        }
        roleGroups[primaryRole].tasks.push(task);
      }
    });

    // For each role group, find employees on shift today with that role
    Object.keys(roleGroups).forEach(roleName => {
      if (roleName !== "Unassigned") {
        roleGroups[roleName].employees = todaysTeam.filter(e => e.role === roleName);
      }
    });

    // Sort tasks within each group by start_at
    Object.values(roleGroups).forEach(group => {
      group.tasks.sort((a, b) => {
        const timeA = a.start_at || a.due_at || "";
        const timeB = b.start_at || b.due_at || "";
        return timeA.localeCompare(timeB);
      });
    });

    // Sort roles alphabetically, but put "Unassigned" last
    return Object.entries(roleGroups)
      .sort(([a], [b]) => {
        if (a === "Unassigned") return 1;
        if (b === "Unassigned") return -1;
        return a.localeCompare(b);
      });
  }, [tasks, todaysTeam, now]);

  // Format countdown
  const formatCountdown = (targetDate: string) => {
    const target = new Date(targetDate);
    const diffMins = differenceInMinutes(target, now);
    const diffSecs = differenceInSeconds(target, now) % 60;

    if (diffMins < 0) return "Overdue";
    if (diffMins === 0) return `${diffSecs}s`;
    if (diffMins < 60) return `${diffMins}m ${Math.abs(diffSecs)}s`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const pendingTasksCount = tasks.filter((t) => t.status !== "completed").length;
  const overdueTasksCount = tasks.filter((t) => 
    t.status !== "completed" && t.due_at && isPast(new Date(t.due_at))
  ).length;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
              <div className="text-xs text-muted-foreground">Clocked In</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{completedTasksCount}</div>
              <div className="text-xs text-muted-foreground">Done Today</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-orange-500/10 border-orange-500/20">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-2xl font-bold text-orange-600">{pendingTasksCount}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
        {/* Left Column: Staff & Tasks */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Staff List */}
          <Card className="flex-1 overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Today's Team ({todaysTeam.length})
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-1">
                {todaysTeam.map((employee) => {
                  const status = attendanceMap.get(employee.id);
                  const isIn = status?.checkedIn && !status?.checkedOut;
                  const isOut = status?.checkedOut;
                    const employeeShift = employeeShiftMap.get(employee.id);

                    return (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {employee.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{employee.full_name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{employee.role}</span>
                              {employeeShift && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span className="text-primary/80">
                                    {employeeShift.start.slice(0, 5)} - {employeeShift.end.slice(0, 5)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                      </div>
                      {isIn ? (
                        <Badge variant="default" className="bg-green-500 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          In
                        </Badge>
                      ) : isOut ? (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Out
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          Not In
                        </Badge>
                      )}
                    </div>
                  );
                })}
                {todaysTeam.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No shifts scheduled for today
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Enhanced Tasks List - Grouped by Role */}
          <Card className="flex-1 overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Today's Tasks ({pendingTasksCount})
                {overdueTasksCount > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {overdueTasksCount} Overdue
                  </Badge>
                )}
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-3">
                {tasksByRole.map(([role, { tasks: roleTasks, employees: roleEmployees }]) => (
                  <div key={role} className="space-y-1">
                    {/* Role Header */}
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${role === "Unassigned" ? "bg-muted-foreground" : "bg-primary"}`} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {role}
                      </span>
                      {roleEmployees.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          ({roleEmployees.map(e => e.full_name.split(' ')[0]).join(', ')})
                        </span>
                      )}
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Tasks for this role */}
                    {roleTasks.map((task) => {
                      const isOverdue = task.due_at && isPast(new Date(task.due_at));
                      const taskTime = task.start_at ? format(new Date(task.start_at), "HH:mm") : null;
                      return (
                        <div
                          key={task.id}
                          className="rounded-lg bg-muted/30 p-2 flex items-center gap-2"
                        >
                          {isOverdue ? (
                            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                          ) : (
                            <Timer className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm truncate block ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                              {task.title}
                            </span>
                            {taskTime && (
                              <span className="text-xs text-muted-foreground">
                                Scheduled: {taskTime}
                              </span>
                            )}
                          </div>
                          {isOverdue ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Overdue
                            </Badge>
                          ) : task.start_at ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              {formatCountdown(task.start_at)}
                            </Badge>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {tasksByRole.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No tasks scheduled for today
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Daily Leaderboard - Today's Champions */}
          <Card className="flex-1 overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Today's Champions
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-1">
                {todaysChampions.map((champion, index) => (
                  <div
                    key={champion.employee_id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? "bg-yellow-500 text-yellow-950"
                          : index === 1
                          ? "bg-gray-300 text-gray-700"
                          : index === 2
                          ? "bg-orange-400 text-orange-950"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{champion.employee_name}</div>
                      <div className="text-xs text-muted-foreground">{champion.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{champion.completed_today}</div>
                      <div className="text-xs text-muted-foreground">tasks</div>
                    </div>
                  </div>
                ))}
                {todaysChampions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    Complete tasks to appear here!
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Weekly Leaderboard - Weekly Stars */}
          <Card className="flex-1 overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-purple-500" />
                Weekly Stars
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-1">
                {weeklyStars.map((star, index) => (
                  <div
                    key={star.employee_id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? "bg-purple-500 text-white"
                          : index === 1
                          ? "bg-purple-300 text-purple-800"
                          : index === 2
                          ? "bg-purple-200 text-purple-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{star.employee_name}</div>
                      <div className="text-xs text-muted-foreground">{star.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">
                        {star.weekly_task_score !== null 
                          ? star.weekly_task_score.toFixed(0) 
                          : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">score</div>
                    </div>
                  </div>
                ))}
                {weeklyStars.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    No completions this week yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default KioskDashboard;
