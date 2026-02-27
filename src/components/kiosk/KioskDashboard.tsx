import { useEffect, useState, useMemo } from "react";
import { useLocationPerformanceScores } from "@/hooks/useLocationPerformanceScores";
import { computeEffectiveScores, sortByEffectiveScore } from "@/lib/effectiveScore";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, differenceInMinutes, differenceInSeconds, isPast } from "date-fns";
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
  type KioskTask,
  type ScheduledEmployee
} from "@/lib/kioskTaskAttribution";
import { 
  buildUserToEmployeeIdMap, 
  resolveCompleterEmployeeId,
  getAttributionDebugInfo
} from "@/lib/tasks/resolveCompleterEmployeeId";

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

  // NOTE: rawTasks is now fetched by useKioskTodayTasks hook (below)
  // This removes the duplicate query and ensures data consistency

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

  // Scheduled employee IDs (used for Champions gating)
  const scheduledEmployeeIds = useMemo(() => {
    return new Set(todaysTeam.map((e) => e.id));
  }, [todaysTeam]);

  // Map auth user/profile ids -> scheduled employee ids (for resilient completer attribution)
  // Uses the centralized utility for consistency
  const userToEmployeeIdMap = useMemo(
    () => buildUserToEmployeeIdMap(todaysTeam as any[]),
    [todaysTeam]
  );

  // ===================================================================
  // USE UNIFIED KIOSK TASKS HOOK (replaces manual occurrence expansion)
  // This ensures Kiosk uses the same pipeline as Mobile for consistency
  // rawTasks now comes from this hook (single source of truth)
  // ===================================================================
  const { 
    todayTasks: unifiedTasks,
    grouped: unifiedGrouped,
    debug: kioskPipelineDebug,
    rawTasks,
    completionsLoading,
  } = useKioskTodayTasks({
    locationId,
    companyId,
    targetDate: today,
    enabled: true,
    kioskToken, // Pass kiosk token for anonymous RPC access to completions
  });

  // Map unified tasks to local Task interface for compatibility with existing kiosk code
  // Coverage is already applied by the unified hook - we just need to map the tasks
  const tasks: (Task & { timeLock?: StaffTaskWithTimeLock['timeLock'] })[] = useMemo(() => {
    // If no staff scheduled today, return empty
    if (todaysTeam.length === 0) {
      return [];
    }

    // IMPORTANT: Do not apply additional kiosk-only filtering here.
    // The unified pipeline (useKioskTodayTasks) is the single source of truth
    // for which tasks are visible today. Extra filters here can cause kiosk ↔ mobile drift.
    return unifiedTasks.map(task => {
      // Re-attach role info from rawTasks for display
      const originalId = getOriginalTaskId(task.id);
      const originalTask = (rawTasks as any[]).find(t => t.id === originalId);
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
        // Flag shared/location-only tasks for the General group
        isLocationOnly: !task.assigned_role_id && !task.assigned_to,
        timeLock: task.timeLock,
      } as Task & { timeLock?: StaffTaskWithTimeLock['timeLock']; isLocationOnly?: boolean };
    });
  }, [unifiedTasks, todaysTeam, rawTasks]);

  // =====================================================
  // KIOSK TASK-BASED LEADERBOARDS (computed from UNIFIED data)
  // Champions must use the same per-occurrence completions as the KPIs
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

  // =====================================================
  // UNIFIED KPI COUNTS (from useKioskTodayTasks)
  // These MUST match what Web/Mobile show
  // =====================================================
  const unifiedCompletedCount = unifiedGrouped.completed.length;
  const unifiedOverdueCount = unifiedGrouped.overdue.length;
  const unifiedPendingCount = unifiedGrouped.pending.length + unifiedGrouped.noCoverage.length;

  // DEV: Log unified KPI debug info
  if (import.meta.env.DEV) {
    console.log("[KIOSK KPI]", {
      doneToday: unifiedGrouped.completed.length,
      overdue: unifiedGrouped.overdue.length,
      pending: unifiedGrouped.pending.length,
      noCoverage: unifiedGrouped.noCoverage.length,
      total: unifiedTasks.length,
      completionsAttached: unifiedTasks.filter(t => t.isOccurrenceCompleted).length,
      debug: kioskPipelineDebug,
    });
  }

  // =====================================================
  // TODAY'S CHAMPIONS - computed from unified completed tasks
  // Uses centralized resolveCompleterEmployeeId utility for resilient attribution
  // =====================================================
  interface ChampionData {
    employee_id: string;
    employee_name: string;
    role: string;
    avatar_url: string | null;
    completed_today: number;
  }
  
  const todaysChampions = useMemo((): ChampionData[] => {
    // Build completion counts by employee from unified completed tasks
    const countsByEmployee = new Map<string, number>();
    
    for (const task of unifiedGrouped.completed) {
      // Use centralized resolver for resilient attribution
      const empId = resolveCompleterEmployeeId(task as any, scheduledEmployeeIds, userToEmployeeIdMap);
      if (!empId) continue;
      countsByEmployee.set(empId, (countsByEmployee.get(empId) || 0) + 1);
    }
    
    // Map to scheduled employees only
    const championsData: ChampionData[] = [];
    for (const [empId, count] of countsByEmployee.entries()) {
      const emp = employeeMap.get(empId);
      if (emp) {
        championsData.push({
          employee_id: empId,
          employee_name: emp.full_name,
          role: emp.role,
          avatar_url: emp.avatar_url,
          completed_today: count,
        });
      }
    }
    
    // Sort by completed_today desc, take top 3
    return championsData
      .filter(c => c.completed_today > 0)
      .sort((a, b) => b.completed_today - a.completed_today)
      .slice(0, 3);
  }, [unifiedGrouped.completed, employeeMap, scheduledEmployeeIds, userToEmployeeIdMap]);

  // DEV-only sanity check: if Done Today > 0 but Champions is empty, attribution is missing.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (unifiedCompletedCount === 0) return;
    
    // Check if champions sum matches done today
    const championsSum = todaysChampions.reduce((acc, c) => acc + c.completed_today, 0);
    const hasMismatch = championsSum !== unifiedCompletedCount;
    
    if (todaysChampions.length === 0 || hasMismatch) {
      const missingAttribution = unifiedGrouped.completed.map((t) => {
        const debugInfo = getAttributionDebugInfo(t as any, scheduledEmployeeIds, userToEmployeeIdMap);
        return {
          title: t.title,
          id: t.id,
          ...debugInfo,
        };
      });
      
      console.warn("[KIOSK Champions Attribution Debug]", {
        doneToday: unifiedCompletedCount,
        championsSum,
        championsEmpty: todaysChampions.length === 0,
        mismatch: hasMismatch,
        scheduledEmployeeCount: scheduledEmployeeIds.size,
        userToEmployeeMapSize: userToEmployeeIdMap.size,
        completedTasks: missingAttribution.slice(0, 10),
      });
    }
  }, [unifiedCompletedCount, todaysChampions, unifiedGrouped.completed, scheduledEmployeeIds, userToEmployeeIdMap]);

  // Legacy DEV check (keeping for compatibility) - now using centralized resolver
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (unifiedCompletedCount === 0) return;
    if (todaysChampions.length > 0) return;

    const missing = unifiedGrouped.completed
      .map((t) => {
        const debugInfo = getAttributionDebugInfo(t as any, scheduledEmployeeIds, userToEmployeeIdMap);
        return {
          id: t.id,
          title: t.title,
          rawCompleter: debugInfo.rawCompleter,
          assigned_to: (t as any).assigned_to ?? null,
          resolvedEmployeeId: debugInfo.resolvedEmployeeId,
          mappedFromUserId: debugInfo.mappedFromUserId,
        };
      })
      .filter((x) => !x.resolvedEmployeeId)
      .slice(0, 15);

    console.warn("[KIOSK Champions] Done Today > 0 but no champions could be attributed.", {
      doneToday: unifiedCompletedCount,
      missing,
    });
  }, [unifiedCompletedCount, todaysChampions.length, unifiedGrouped.completed, scheduledEmployeeIds, userToEmployeeIdMap]);

  // MTD Score - use server-side scoring function (bypasses RLS for accurate scores)
  const mtdStartFormatted = format(startOfMonth(today), 'yyyy-MM-dd');
  const mtdEndFormatted = format(today, 'yyyy-MM-dd');
  const { data: weeklyAllScores = [] } = useLocationPerformanceScores(
    locationId,
    mtdStartFormatted,
    mtdEndFormatted
  );
  const weeklyScoreLeaderboard = useMemo(() => {
    const effective = computeEffectiveScores(weeklyAllScores, true);
    return sortByEffectiveScore(effective).slice(0, 10);
  }, [weeklyAllScores]);

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

  // LEGACY: These are now replaced by unified counts from useKioskTodayTasks
  // Keep isTaskOverdue helper for task list display
  const isTaskOverdue = (t: Task) => {
    if (t.status === "completed") return false;
    if (t.due_at && isPast(new Date(t.due_at))) return true;
    if (!t.due_at && t.start_at && isPast(new Date(t.start_at))) return true;
    return false;
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Overdue Alert Banner - Prominent when there are overdue tasks */}
      {/* CRITICAL: Wait for completions to load before showing banner to prevent flash */}
      {!completionsLoading && unifiedOverdueCount > 0 && (
        <div className="animate-pulse bg-destructive/90 text-destructive-foreground rounded-lg p-4 flex items-center justify-between shadow-lg border-2 border-destructive">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-lg">
                {unifiedOverdueCount} {unifiedOverdueCount === 1 ? 'Task' : 'Tasks'} Overdue!
              </div>
              <div className="text-sm opacity-90">
                Action required - check tasks below
              </div>
            </div>
          </div>
          <div className="text-4xl font-bold">{unifiedOverdueCount}</div>
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
              <div className="text-2xl font-bold text-blue-600">{unifiedCompletedCount}</div>
              <div className="text-xs text-muted-foreground">Done Today</div>
            </div>
          </div>
        </Card>
        <Card className={`p-3 ${unifiedOverdueCount > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <div className="flex items-center gap-2">
            {unifiedOverdueCount > 0 ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Timer className="h-5 w-5 text-orange-500" />
            )}
            <div>
              <div className={`text-2xl font-bold ${unifiedOverdueCount > 0 ? 'text-destructive' : 'text-orange-600'}`}>
                {unifiedPendingCount}
              </div>
              <div className="text-xs text-muted-foreground">
                {unifiedOverdueCount > 0 ? `Pending (${unifiedOverdueCount} overdue)` : 'Pending'}
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
                Today's Tasks ({unifiedPendingCount})
                {unifiedOverdueCount > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {unifiedOverdueCount} Overdue
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

           {/* MTD Leaderboard - Month-to-Date Score */}
           <Card className="flex-1 overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-purple-500" />
                MTD Score
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-1">
                {weeklyScoreLeaderboard.map((emp, index) => (
                  <div
                    key={emp.employee_id}
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
                      <div className="font-medium text-sm truncate">{emp.employee_name}</div>
                      <div className="text-xs text-muted-foreground">{emp.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">
                        {emp.effective_score !== null ? emp.effective_score.toFixed(0) : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">score</div>
                    </div>
                  </div>
                ))}
                {weeklyScoreLeaderboard.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    No scores this week yet
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
