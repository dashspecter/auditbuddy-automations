import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInMinutes, differenceInSeconds, isPast } from "date-fns";
import { getOccurrencesForDate, getOriginalTaskId } from "@/lib/taskOccurrenceEngine";
import type { Task as BaseTask } from "@/hooks/useTasks";
import { useKioskTodayTasks, StaffTaskWithTimeLock } from "@/hooks/useStaffTodayTasks";
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
  AlertTriangle,
  Lock
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
  /** The kiosk token/slug from the public kiosk URL (used for scoped anonymous reads). */
  kioskToken: string;
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

export const KioskDashboard = ({ locationId, companyId, kioskToken }: KioskDashboardProps) => {
  const today = new Date();
  // Use proper ISO timestamps for database queries (timestamptz columns)
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
      const { data, error } = await supabase.rpc("get_kiosk_attendance_logs", {
        p_token: kioskToken,
        p_location_id: locationId,
        p_start: todayStart,
        p_end: todayEnd,
      });
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

      // Attach role info to tasks - PRIMARY ROLE from assigned_role_id, additional from task_roles
      // The PRIMARY role (assigned_role_id) should always come first for display purposes
      return data.map((task: any) => {
        const taskRoleEntries = (taskRoles || []).filter((tr: any) => tr.task_id === task.id);
        
        // Build role list with PRIMARY role first (assigned_role_id)
        const roleIds: string[] = [];
        const roleNames: string[] = [];
        
        // 1. Add PRIMARY role first (direct assigned_role_id on task)
        if (task.assigned_role_id && roleMap[task.assigned_role_id]) {
          roleIds.push(task.assigned_role_id);
          roleNames.push(roleMap[task.assigned_role_id]);
        }
        
        // 2. Add additional roles from task_roles table (excluding duplicates)
        taskRoleEntries.forEach((tr: any) => {
          if (!roleIds.includes(tr.role_id) && roleMap[tr.role_id]) {
            roleIds.push(tr.role_id);
            roleNames.push(roleMap[tr.role_id]);
          }
        });
        
        return {
          ...task,
          role_ids: roleIds,
          role_names: roleNames
        };
      }) as (BaseTask & { role_ids?: string[]; role_names?: string[] })[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
  // IMPORTANT:
  // The RPC returns multiple logs per staff member, ordered by newest first.
  // We must only use the latest log for status; otherwise an older checked-out
  // record can incorrectly overwrite a newer checked-in record.
  attendance.forEach((log) => {
    if (attendanceMap.has(log.staff_id)) return; // keep newest status

    attendanceMap.set(log.staff_id, {
      checkedIn: true,
      checkedOut: !!log.check_out_at,
    });
  });

  // Create shift map for employees - MUST be computed before tasks
  const employeeShiftMap = new Map<string, { start: string; end: string }>();
  shifts.forEach((shift) => {
    shift.shift_assignments?.forEach((assignment) => {
      employeeShiftMap.set(assignment.staff_id, {
        start: shift.start_time,
        end: shift.end_time,
      });
    });
  });

  // Filter employees to only those with shifts today - MUST be computed before tasks
  const todaysTeam = employees.filter((e) => employeeShiftMap.has(e.id));

  // ===================================================================
  // USE UNIFIED KIOSK TASKS HOOK (replaces manual occurrence expansion)
  // This ensures Kiosk uses the same pipeline as Mobile for consistency
  // ===================================================================
  const { 
    todayTasks: unifiedTasks,
    grouped: unifiedGrouped,
    debug: kioskPipelineDebug,
  } = useKioskTodayTasks({
    locationId,
    companyId,
    targetDate: today,
    enabled: true,
  });

  // Map unified tasks to local Task interface for compatibility with existing kiosk code
  // Coverage is already applied by the unified hook - we just need to map the tasks
  const tasks: (Task & { timeLock?: StaffTaskWithTimeLock['timeLock'] })[] = useMemo(() => {
    // If no staff scheduled today, return empty
    if (todaysTeam.length === 0) {
      return [];
    }
    
    // Get roles that are scheduled today
    const scheduledRoles = new Set(todaysTeam.map(e => e.role?.toLowerCase()).filter(Boolean));
    const scheduledEmployeeIds = new Set(todaysTeam.map(e => e.id));
    
    return unifiedTasks
      .map(task => {
        // Re-attach role info from rawTasks for display
        const originalId = getOriginalTaskId(task.id);
        const originalTask = rawTasks.find(t => t.id === originalId);
        return {
          id: task.id,
          title: task.title,
          status: task.status,
          assigned_to: task.assigned_to,
          priority: task.priority,
          start_at: task.start_at,
          due_at: task.due_at,
          role_ids: originalTask?.role_ids || [],
          role_names: originalTask?.role_names || [],
          // Flag location-only tasks for the General group
          isLocationOnly: !task.assigned_role_id && !task.assigned_to,
          timeLock: task.timeLock,
        } as Task & { timeLock?: StaffTaskWithTimeLock['timeLock']; isLocationOnly?: boolean };
      })
      .filter(task => {
        // Check if task has coverage:
        // 1. Direct assignment to a scheduled employee
        if (task.assigned_to && scheduledEmployeeIds.has(task.assigned_to)) {
          return true;
        }
        // 2. Role assignment matches a scheduled role
        const taskRoles = (task.role_names || []).map(r => r.toLowerCase());
        if (taskRoles.some(r => scheduledRoles.has(r))) {
          return true;
        }
        // 3. Location-only tasks - visible to ALL scheduled employees at this location
        if ((task as any).isLocationOnly) {
          return true;
        }
        return false;
      });
  }, [unifiedTasks, todaysTeam, rawTasks]);

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
      completed_by: task.completed_by, // Include actual completer for attribution
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
  // LOCATION-ONLY tasks (no role) go under "General" group
  // This matches the main Tasks page behavior where each task is shown once
  type TaskWithTimeLock = Task & { timeLock?: StaffTaskWithTimeLock['timeLock']; isLocationOnly?: boolean };
  const tasksByRole = useMemo(() => {
    const roleGroups: Record<string, { 
      tasks: TaskWithTimeLock[];
      employees: Employee[];
    }> = {};
    const seenTaskIds = new Set<string>();

    // Get all pending/in-progress tasks
    const pendingTasks = tasks.filter(t => t.status !== "completed");
    
    // Group tasks by their PRIMARY assigned role (first role only to avoid duplicates)
    // Location-only tasks go to "General" group
    pendingTasks.forEach(task => {
      // Skip if we've already added this task
      const taskBaseId = getOriginalTaskId(task.id);
      if (seenTaskIds.has(taskBaseId)) return;
      seenTaskIds.add(taskBaseId);
      
      const roleNames = task.role_names || [];
      const isLocationOnly = (task as any).isLocationOnly;
      
      if (isLocationOnly || roleNames.length === 0) {
        // Location-only tasks OR unassigned - put in "General" group (for all staff at this location)
        if (!roleGroups["General"]) {
          roleGroups["General"] = { tasks: [], employees: todaysTeam };
        }
        roleGroups["General"].tasks.push(task);
      } else {
        // Add task ONLY to its first/primary assigned role (not all roles)
        const primaryRole = roleNames[0];
        if (!roleGroups[primaryRole]) {
          roleGroups[primaryRole] = { tasks: [], employees: [] };
        }
        roleGroups[primaryRole].tasks.push(task);
      }
    });

    // For each role group (except General), find employees on shift today with that role
    Object.keys(roleGroups).forEach(roleName => {
      if (roleName !== "General") {
        roleGroups[roleName].employees = todaysTeam.filter(e => e.role === roleName);
      }
    });

    // Sort tasks within each group: OVERDUE FIRST, then by start_at
    // Overdue = due_at past OR (no due_at AND start_at past)
    const checkOverdue = (t: Task) => 
      (t.due_at && isPast(new Date(t.due_at))) || 
      (!t.due_at && t.start_at && isPast(new Date(t.start_at)));
    
    Object.values(roleGroups).forEach(group => {
      group.tasks.sort((a, b) => {
        const aOverdue = checkOverdue(a);
        const bOverdue = checkOverdue(b);
        
        // Overdue tasks always come first
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        // Within same category, sort by time
        const timeA = a.start_at || a.due_at || "";
        const timeB = b.start_at || b.due_at || "";
        return timeA.localeCompare(timeB);
      });
    });

    // Sort roles alphabetically, but put "General" last (it's for all staff)
    return Object.entries(roleGroups)
      .sort(([a], [b]) => {
        if (a === "General") return 1;
        if (b === "General") return -1;
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
  
  // Check if task is overdue: due_at is past, OR if no due_at, check if start_at is past
  const isTaskOverdue = (t: Task) => {
    if (t.status === "completed") return false;
    if (t.due_at && isPast(new Date(t.due_at))) return true;
    if (!t.due_at && t.start_at && isPast(new Date(t.start_at))) return true;
    return false;
  };
  
  const overdueTasksCount = tasks.filter(isTaskOverdue).length;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Overdue Alert Banner - Prominent when there are overdue tasks */}
      {overdueTasksCount > 0 && (
        <div className="animate-pulse bg-destructive/90 text-destructive-foreground rounded-lg p-4 flex items-center justify-between shadow-lg border-2 border-destructive">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-lg">
                {overdueTasksCount} {overdueTasksCount === 1 ? 'Task' : 'Tasks'} Overdue!
              </div>
              <div className="text-sm opacity-90">
                Action required - check tasks below
              </div>
            </div>
          </div>
          <div className="text-4xl font-bold">{overdueTasksCount}</div>
        </div>
      )}

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
        <Card className={`p-3 ${overdueTasksCount > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <div className="flex items-center gap-2">
            {overdueTasksCount > 0 ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Timer className="h-5 w-5 text-orange-500" />
            )}
            <div>
              <div className={`text-2xl font-bold ${overdueTasksCount > 0 ? 'text-destructive' : 'text-orange-600'}`}>
                {pendingTasksCount}
              </div>
              <div className="text-xs text-muted-foreground">
                {overdueTasksCount > 0 ? `Pending (${overdueTasksCount} overdue)` : 'Pending'}
              </div>
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
                      // Overdue: due_at is past, OR if no due_at, start_at is past
                      const isOverdue = (task.due_at && isPast(new Date(task.due_at))) || 
                                        (!task.due_at && task.start_at && isPast(new Date(task.start_at)));
                      const taskTime = task.start_at ? format(new Date(task.start_at), "HH:mm") : null;
                      const isLocked = task.timeLock && !task.timeLock.canComplete;
                      const unlockTime = task.timeLock?.unlockAtFormatted;
                      
                      return (
                        <div
                          key={task.id}
                          className={`rounded-lg p-2 flex items-center gap-2 transition-all ${
                            isOverdue 
                              ? 'bg-destructive/15 border-2 border-destructive/40 shadow-sm animate-pulse' 
                              : isLocked
                              ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800'
                              : 'bg-muted/30'
                          }`}
                        >
                          {isOverdue ? (
                            <div className="bg-destructive rounded-full p-1.5 flex-shrink-0">
                              <AlertTriangle className="h-4 w-4 text-destructive-foreground" />
                            </div>
                          ) : isLocked ? (
                            <Lock className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          ) : (
                            <Timer className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm truncate block ${
                              isOverdue ? 'text-destructive font-bold' : 
                              isLocked ? 'text-orange-700 dark:text-orange-400' : ''
                            }`}>
                              {task.title}
                            </span>
                            {taskTime && (
                              <span className={`text-xs ${
                                isOverdue ? 'text-destructive/70' : 
                                isLocked ? 'text-orange-600/70 dark:text-orange-400/70' : 
                                'text-muted-foreground'
                              }`}>
                                {isOverdue ? 'Was due: ' : isLocked ? 'Scheduled: ' : 'Scheduled: '}{taskTime}
                              </span>
                            )}
                          </div>
                          {isOverdue ? (
                            <Badge variant="destructive" className="text-xs px-2 py-0.5 font-bold animate-pulse">
                              ⚠ OVERDUE
                            </Badge>
                          ) : isLocked && unlockTime ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                              <Lock className="h-3 w-3 mr-1" />
                              {unlockTime}
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
