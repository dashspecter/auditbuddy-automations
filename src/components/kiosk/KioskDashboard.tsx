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
import { QRCodeSVG } from "qrcode.react";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  ListTodo,
  Trophy,
  XCircle,
  Timer,
  AlertTriangle,
  Lock,
  RefreshCw
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
  /** Optional department filter — when set, only employees whose role belongs to this department are shown. */
  departmentId?: string | null;
  /** QR code payload string for check-in/out scanning */
  qrData?: string;
  /** Countdown seconds until next QR refresh */
  countdown?: number;
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

export const KioskDashboard = ({ locationId, companyId, kioskToken, departmentId, qrData, countdown = 30 }: KioskDashboardProps) => {
  const today = new Date();
  // Use proper ISO timestamps for database queries (timestamptz columns)
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString();

  // Fetch department role names when departmentId is set
  const { data: departmentRoleNames } = useQuery({
    queryKey: ["kiosk-department-roles", departmentId],
    queryFn: async () => {
      if (!departmentId) return null;
      const { data, error } = await supabase
        .from("employee_roles")
        .select("name")
        .eq("department_id", departmentId);
      if (error) throw error;
      return data.map(r => r.name);
    },
    enabled: !!departmentId,
  });

  // Fetch employees at this location
  const { data: allEmployees = [] } = useQuery({
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
    refetchInterval: 30000,
  });

  // Filter employees by department roles if departmentId is set
  const employees = useMemo(() => {
    if (!departmentId || !departmentRoleNames) return allEmployees;
    return allEmployees.filter(e => departmentRoleNames.includes(e.role));
  }, [allEmployees, departmentId, departmentRoleNames]);

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

    let mapped = unifiedTasks.map(task => {
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

    // Filter tasks by department roles when department filter is active
    if (departmentId && departmentRoleNames) {
      const deptEmployeeIds = new Set(employees.map(e => e.id));
      mapped = mapped.filter(task => {
        // Keep tasks assigned directly to a department employee
        if (task.assigned_to && deptEmployeeIds.has(task.assigned_to)) return true;
        // Keep tasks with matching role names
        if (task.role_names?.some(r => departmentRoleNames.includes(r))) return true;
        // Keep General/unassigned tasks (no role, no assignee) — shared across all
        if (!task.assigned_to && (!task.role_names || task.role_names.length === 0)) return true;
        return false;
      });
    }

    return mapped;
  }, [unifiedTasks, todaysTeam, rawTasks, departmentId, departmentRoleNames, employees]);

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
  // UNIFIED KPI COUNTS — recomputed from filtered tasks list
  // so they respect the department filter
  // =====================================================
  const unifiedCompletedCount = tasks.filter(t => t.status === "completed").length;
  const unifiedOverdueCount = tasks.filter(t => t.status !== "completed" && t.due_at && isPast(new Date(t.due_at))).length;
  const unifiedPendingCount = tasks.filter(t => t.status !== "completed" && !(t.due_at && isPast(new Date(t.due_at)))).length;

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
  
  // Filtered completed tasks for champions (respects department filter)
  const filteredCompletedTasks = useMemo(() => {
    return tasks.filter(t => t.status === "completed");
  }, [tasks]);

  const todaysChampions = useMemo((): ChampionData[] => {
    // Build completion counts by employee from filtered completed tasks
    const countsByEmployee = new Map<string, number>();
    
    // We need to find the unified task objects for attribution resolution
    for (const task of filteredCompletedTasks) {
      // Find matching unified task for completer info
      const unifiedTask = unifiedTasks.find(ut => ut.id === task.id);
      if (!unifiedTask) continue;
      
      // Use centralized resolver for resilient attribution
      const empId = resolveCompleterEmployeeId(unifiedTask as any, scheduledEmployeeIds, userToEmployeeIdMap);
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
  }, [filteredCompletedTasks, unifiedTasks, employeeMap, scheduledEmployeeIds, userToEmployeeIdMap]);

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
    let scores = computeEffectiveScores(weeklyAllScores, false);
    // Filter by department roles if set
    if (departmentId && departmentRoleNames) {
      scores = scores.filter(s => departmentRoleNames.includes(s.role));
    }
    return sortByEffectiveScore(scores).slice(0, 10);
  }, [weeklyAllScores, departmentId, departmentRoleNames]);

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
        // Add task to its primary role — filtered to department roles when in department kiosk
        const filteredRoleNames = (departmentId && departmentRoleNames)
          ? roleNames.filter(r => departmentRoleNames.includes(r))
          : roleNames;
        const primaryRole = filteredRoleNames.length > 0 ? filteredRoleNames[0] : roleNames[0];
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Overdue Alert Banner */}
      {!completionsLoading && unifiedOverdueCount > 0 && (
        <div className="mx-4 mt-4 animate-pulse bg-destructive/90 text-destructive-foreground rounded-lg p-4 flex items-center justify-between shadow-lg border-2 border-destructive flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-lg">
                {unifiedOverdueCount} {unifiedOverdueCount === 1 ? 'Task' : 'Tasks'} Overdue!
              </div>
              <div className="text-sm opacity-90">Action required - check tasks below</div>
            </div>
          </div>
          <div className="text-4xl font-bold">{unifiedOverdueCount}</div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 px-4 pt-4 flex-shrink-0">
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

      {/* 3-Column Layout: Left sidebar (QR+Team+MTD) | Center (Tasks) | Right (Champions) */}
      {/* On < xl: stacks vertically */}
      <div className="flex-1 flex flex-col xl:flex-row gap-4 p-4 overflow-hidden min-h-0">

        {/* ===== LEFT SIDEBAR: QR + Team + MTD ===== */}
        <div className="xl:w-[300px] flex-shrink-0 flex flex-col gap-3 overflow-hidden">
          {/* QR Code Card */}
          {qrData && (
            <Card className="flex-shrink-0 p-4 flex flex-col items-center gap-2">
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG
                  value={qrData}
                  size={180}
                  level="H"
                  includeMargin
                  className="w-[140px] h-[140px] xl:w-[180px] xl:h-[180px]"
                />
              </div>
              <h3 className="text-sm font-semibold text-center">Scan to Check In/Out</h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className={`h-3 w-3 ${countdown <= 5 ? 'animate-spin text-primary' : ''}`} />
                <span className="text-xs">
                  New code in <span className="font-mono font-bold text-foreground">{countdown}s</span>
                </span>
              </div>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 30) * 100}%` }}
                />
              </div>
            </Card>
          )}

          {/* Today's Team */}
          <Card className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="p-3 border-b bg-muted/50 flex-shrink-0">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Today's Team ({todaysTeam.length})
              </h3>
            </div>
            <ScrollArea className="flex-1">
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
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {employee.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-xs">{employee.full_name}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span>{employee.role}</span>
                            {employeeShift && (
                              <>
                                <span className="text-muted-foreground/50">•</span>
                                <span className="text-primary/80">
                                  {employeeShift.start.slice(0, 5)}-{employeeShift.end.slice(0, 5)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {isIn ? (
                        <Badge variant="default" className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" />
                          In
                        </Badge>
                      ) : isOut ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <XCircle className="h-3 w-3 mr-0.5" />
                          Out
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">
                          <Clock className="h-3 w-3 mr-0.5" />
                          —
                        </Badge>
                      )}
                    </div>
                  );
                })}
                {todaysTeam.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No shifts scheduled
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* MTD Score */}
          <Card className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="p-3 border-b bg-muted/50 flex-shrink-0">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-purple-500" />
                MTD Score
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {weeklyScoreLeaderboard.map((emp, index) => (
                  <div
                    key={emp.employee_id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                  >
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
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
                      <div className="font-medium text-xs truncate">{emp.employee_name}</div>
                      <div className="text-[10px] text-muted-foreground">{emp.role}</div>
                    </div>
                    <div className="text-sm font-bold text-purple-600">
                      {emp.effective_score !== null ? emp.effective_score.toFixed(0) : "—"}
                    </div>
                  </div>
                ))}
                {weeklyScoreLeaderboard.length === 0 && (
                  <div className="text-center py-3 text-muted-foreground text-sm">
                    <Trophy className="h-6 w-6 mx-auto mb-1 opacity-20" />
                    No scores yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* ===== CENTER: Today's Tasks (dominant) ===== */}
        <Card className="flex-1 overflow-hidden flex flex-col min-h-0 xl:min-w-0">
          <div className="p-3 border-b bg-muted/50 flex-shrink-0">
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
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3">
              {tasksByRole.map(([role, { tasks: roleTasks, employees: roleEmployees }]) => (
                <div key={role} className="space-y-1">
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
                  {roleTasks.map((task) => {
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
                              {isOverdue ? 'Was due: ' : 'Scheduled: '}{taskTime}
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

        {/* ===== RIGHT: Today's Champions (narrower) ===== */}
        <Card className="xl:w-[280px] flex-shrink-0 overflow-hidden flex flex-col min-h-0">
          <div className="p-3 border-b bg-muted/50 flex-shrink-0">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Today's Champions
            </h3>
          </div>
          <ScrollArea className="flex-1">
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
                <div className="text-center py-3 text-muted-foreground text-sm">
                  <Trophy className="h-8 w-8 mx-auto mb-1 opacity-20" />
                  Complete tasks to appear here!
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default KioskDashboard;
