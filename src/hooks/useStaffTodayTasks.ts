/**
 * UNIFIED STAFF TODAY TASKS HOOK
 * 
 * Single source of truth for both Kiosk and Mobile staff task views.
 * Ensures task visibility is consistent across all staff-facing interfaces.
 * 
 * Pipeline:
 * 1. Derive staff context from employees table (NOT company_users)
 * 2. Resolve employee role to role_id
 * 3. Fetch tasks: direct assignments + role-based + shared role tasks
 * 4. Fetch per-occurrence completions from task_completions table
 * 5. Expand recurring tasks into occurrences for target date
 * 6. Fetch shifts and apply coverage filtering (dayBasedCoverage: visible all day if shift exists)
 * 7. Apply time-lock rules for task completion
 */

import { useMemo, useState, useEffect, useRef } from "react";
import { useSmartPolling } from "./useSmartPolling";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Task } from "./useTasks";
import { useShiftCoverage } from "./useShiftCoverage";
import { Shift } from "@/lib/taskCoverageEngine";
import {
  runPipelineForDate,
  groupTasksByStatusShiftAware,
  TaskWithCoverage,
} from "@/lib/unifiedTaskPipeline";
import {
  getCanonicalToday,
  getOriginalTaskId,
} from "@/lib/taskOccurrenceEngine";
import { toDayKey, normalizeRoleName } from "@/lib/companyDayUtils";
import { startOfDay, endOfDay, format } from "date-fns";
import { getTimeLockStatus, TimeLockStatus } from "@/lib/taskTimeLock";
import {
  getBaseTaskId,
  makeCompletionKey,
  buildCompletionsMap,
} from "@/lib/tasks/completionIdentity";

// =============================================================
// TYPES
// =============================================================

export interface StaffContext {
  employeeId: string;
  companyId: string;
  locationId: string | null;
  role: string | null;
  resolvedRoleId: string | null;
  roleName: string | null;
}

export interface StaffTaskWithTimeLock extends TaskWithCoverage {
  timeLock?: TimeLockStatus;
  /** Whether this occurrence is completed (from task_completions) */
  isOccurrenceCompleted?: boolean;
  /** Employee ID who completed this occurrence (for Champions attribution) */
  completed_by_employee_id?: string | null;
  /** Completion mode (early, on_time, late, override) */
  completion_mode?: string;
}

export interface StaffTodayTasksResult {
  /** All today's tasks (after coverage filter) */
  todayTasks: StaffTaskWithTimeLock[];
  /** Grouped by status */
  grouped: {
    pending: StaffTaskWithTimeLock[];
    overdue: StaffTaskWithTimeLock[];
    completed: StaffTaskWithTimeLock[];
    noCoverage: StaffTaskWithTimeLock[];
  };
  /** Active tasks (pending, unlocked) */
  activeTasks: StaffTaskWithTimeLock[];
  /** Upcoming tasks (locked) */
  upcomingTasks: StaffTaskWithTimeLock[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Staff context for debugging */
  staffContext: StaffContext | null;
  /** Raw tasks before pipeline */
  rawTasks: Task[];
  /** Shifts for coverage */
  shifts: Shift[];
  /** Debug stats */
  debug: StaffTodayDebugStats;
}

export interface StaffTodayDebugStats {
  /** Employee resolved info */
  employee: {
    id: string;
    companyId: string;
    locationId: string | null;
    role: string | null;
    resolvedRoleId: string | null;
  } | null;
  /** Raw task counts */
  rawTasksCount: number;
  /** Occurrences generated for today */
  occurrencesGeneratedCount: number;
  /** Shifts found */
  shiftsCount: number;
  /** Approved shift assignments count */
  approvedAssignmentsCount: number;
  /** Visible after coverage filter */
  visibleCount: number;
  /** Bucket breakdown */
  buckets: {
    pending: number;
    overdue: number;
    completed: number;
    noCoverage: number;
  };
  /** Sample tasks for verification */
  sampleTasks: Array<{
    title: string;
    start_at: string | null;
    recurrence_type: string | null;
    recurrence_days_of_week: number[] | null;
    assigned_role_id: string | null;
    location_id: string | null;
    timeLockStatus?: string;
  }>;
  /** Coverage reasons breakdown */
  coverageReasons: {
    noShift: number;
    roleMismatch: number;
    locationMismatch: number;
    noApprovedAssignments: number;
    taskRoleNameMissing: number;
  };
  /** Now timestamp for debugging */
  now: string;
  /** Today's date key */
  todayKey: string;
}

export interface UseStaffTodayTasksOptions {
  /** Override employee ID (for kiosk use) */
  employeeId?: string;
  /** Override company ID */
  companyId?: string;
  /** Override location ID */
  locationId?: string;
  /** Target date (default: today) */
  targetDate?: Date;
  /** Enable query */
  enabled?: boolean;
}

// Completion record from task_completions table
interface CompletionRecord {
  task_id: string;
  occurrence_date: string;
  completed_by_employee_id: string | null;
  completed_at: string;
  completion_mode: string;
}

// =============================================================
// HOOK IMPLEMENTATION
// =============================================================

export function useStaffTodayTasks(
  options: UseStaffTodayTasksOptions = {}
): StaffTodayTasksResult {
  const { user } = useAuth();
  const { 
    targetDate = getCanonicalToday(), 
    enabled = true,
    employeeId: overrideEmployeeId,
    companyId: overrideCompanyId,
    locationId: overrideLocationId,
  } = options;

  // Staff context state
  const [staffContext, setStaffContext] = useState<StaffContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  const targetDayKey = toDayKey(targetDate);

  // 1. Derive staff context from employees table
  useEffect(() => {
    const fetchContext = async () => {
      if (!enabled) return;
      
      let employeeId = overrideEmployeeId;
      let companyId = overrideCompanyId;
      let locationId = overrideLocationId || null;
      
      if (!employeeId && user?.id) {
        const { data: emp, error } = await supabase
          .from("employees")
          .select("id, company_id, location_id, role")
          .eq("user_id", user.id)
          .single();
        
        if (error || !emp) {
          if (import.meta.env.DEV) {
            console.log("[useStaffTodayTasks] No employee found for user:", user.id);
          }
          setContextLoading(false);
          return;
        }
        
        employeeId = emp.id;
        companyId = companyId || emp.company_id;
        locationId = locationId || emp.location_id;
        
        // Resolve role to role_id
        let resolvedRoleId: string | null = null;
        let roleName: string | null = emp.role || null;
        
        if (emp.role && emp.company_id) {
          const { data: roles } = await supabase
            .from("employee_roles")
            .select("id, name")
            .eq("company_id", emp.company_id);
          
          const normalizedEmpRole = normalizeRoleName(emp.role);
          const matchedRole = (roles || []).find(
            (r) => normalizeRoleName(r.name) === normalizedEmpRole
          );
          
          if (matchedRole) {
            resolvedRoleId = matchedRole.id;
            roleName = matchedRole.name;
          }
        }
        
        setStaffContext({
          employeeId,
          companyId: companyId!,
          locationId,
          role: emp.role,
          resolvedRoleId,
          roleName,
        });
      } else if (employeeId && companyId) {
        // Kiosk mode: employee context provided externally
        setStaffContext({
          employeeId,
          companyId,
          locationId,
          role: null,
          resolvedRoleId: null,
          roleName: null,
        });
      }
      
      setContextLoading(false);
    };
    
    fetchContext();
  }, [user?.id, enabled, overrideEmployeeId, overrideCompanyId, overrideLocationId]);

  // 2. Fetch tasks for this staff member
  const { data: rawTasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ["staff-today-tasks", staffContext?.companyId, staffContext?.employeeId, staffContext?.locationId, targetDayKey],
    queryFn: async () => {
      if (!staffContext?.companyId) return [];
      
      const { employeeId, companyId, locationId, resolvedRoleId } = staffContext;
      
      // A) Direct assignments to this employee
      const { data: directTasks, error: directError } = await supabase
        .from("tasks")
        .select(`
          *,
          location:locations(id, name),
          assigned_role:employee_roles(id, name)
        `)
        .eq("company_id", companyId)
        .eq("assigned_to", employeeId);
      
      if (directError) throw directError;

      // B) Role-based tasks (if role resolved)
      let roleTasks: any[] = [];
      if (resolvedRoleId) {
        const { data: roleTasksPrimary } = await supabase
          .from("tasks")
          .select(`
            *,
            location:locations(id, name),
            assigned_role:employee_roles(id, name)
          `)
          .eq("company_id", companyId)
          .eq("assigned_role_id", resolvedRoleId)
          .is("assigned_to", null);
        
        roleTasks = roleTasksPrimary || [];
        
        // B2) Multi-role tasks via task_roles junction table
        const { data: junctionMatches } = await supabase
          .from("task_roles")
          .select("task_id")
          .eq("role_id", resolvedRoleId);

        const junctionTaskIds = (junctionMatches || [])
          .map((tr: any) => tr.task_id)
          .filter((id: string) => !roleTasks.some((t: any) => t.id === id));

        if (junctionTaskIds.length > 0) {
          const { data: junctionTasks } = await supabase
            .from("tasks")
            .select(`
              *,
              location:locations(id, name),
              assigned_role:employee_roles(id, name)
            `)
            .eq("company_id", companyId)
            .is("assigned_to", null)
            .in("id", junctionTaskIds);

          roleTasks = [...roleTasks, ...(junctionTasks || [])];
        }
      }
      
      // C) LOCATION-ONLY tasks - tasks assigned to the location but NOT to specific employee/role
      // These are shared tasks for EVERYONE at the location (e.g., "Empty Bins")
      let locationOnlyTasks: any[] = [];
      if (locationId) {
        const { data: locTasks } = await supabase
          .from("tasks")
          .select(`
            *,
            location:locations(id, name),
            assigned_role:employee_roles(id, name)
          `)
          .eq("company_id", companyId)
          .eq("location_id", locationId)
          .is("assigned_to", null)
          .is("assigned_role_id", null);
        
        locationOnlyTasks = locTasks || [];
      }
      
      // Combine and deduplicate
      const allTasks = [...(directTasks || []), ...roleTasks, ...locationOnlyTasks];
      const uniqueTasks = allTasks.filter(
        (task, index, self) => index === self.findIndex((t) => t.id === task.id)
      );
      
      // Enrich tasks with task_location_ids from junction table
      const taskIds = uniqueTasks.map(t => t.id);
      let taskLocationMap: Record<string, string[]> = {};
      if (taskIds.length > 0) {
        const { data: taskLocations } = await supabase
          .from("task_locations")
          .select("task_id, location_id")
          .in("task_id", taskIds);
        
        if (taskLocations) {
          for (const tl of taskLocations) {
            if (!taskLocationMap[tl.task_id]) taskLocationMap[tl.task_id] = [];
            taskLocationMap[tl.task_id].push(tl.location_id);
          }
        }
      }
      
      // Enrich tasks with task_role_ids and task_role_names from junction table
      let taskRolesMap: Record<string, string[]> = {};
      let roleNamesMap: Record<string, string> = {};
      if (taskIds.length > 0) {
        const { data: taskRolesData } = await supabase
          .from("task_roles")
          .select("task_id, role_id")
          .in("task_id", taskIds);
        
        if (taskRolesData && taskRolesData.length > 0) {
          // Collect unique role IDs to resolve names
          const uniqueRoleIds = [...new Set(taskRolesData.map(tr => tr.role_id))];
          const { data: rolesData } = await supabase
            .from("employee_roles")
            .select("id, name")
            .in("id", uniqueRoleIds);
          
          if (rolesData) {
            for (const r of rolesData) {
              roleNamesMap[r.id] = r.name;
            }
          }
          
          for (const tr of taskRolesData) {
            if (!taskRolesMap[tr.task_id]) taskRolesMap[tr.task_id] = [];
            taskRolesMap[tr.task_id].push(tr.role_id);
          }
        }
      }
      
      const enrichedTasks = uniqueTasks.map(t => {
        // Build complete role lists: primary + junction
        const junctionRoleIds = taskRolesMap[t.id] || [];
        const allRoleIds = t.assigned_role_id 
          ? [t.assigned_role_id, ...junctionRoleIds.filter(id => id !== t.assigned_role_id)]
          : junctionRoleIds;
        const allRoleNames = allRoleIds.map(id => roleNamesMap[id]).filter(Boolean);
        
        return {
          ...t,
          task_location_ids: taskLocationMap[t.id] || (t.location_id ? [t.location_id] : []),
          task_role_ids: allRoleIds,
          task_role_names: allRoleNames,
        };
      });

      if (import.meta.env.DEV) {
        console.log("[useStaffTodayTasks] Fetched tasks:", {
          direct: directTasks?.length || 0,
          role: roleTasks.length,
          locationOnly: locationOnlyTasks.length,
          unique: uniqueTasks.length,
          enrichedWithLocations: Object.keys(taskLocationMap).length,
        });
      }
      
      return enrichedTasks as Task[];
    },
    enabled: enabled && !!staffContext?.companyId,
  });

  // 3. Fetch per-occurrence completions for today
  // Use stable query key that doesn't include full task list to avoid re-fetches
  const { data: completions = [] } = useQuery({
    queryKey: ["task-completions", staffContext?.companyId, targetDayKey, rawTasks.length],
    queryFn: async (): Promise<CompletionRecord[]> => {
      if (!staffContext?.companyId) return [];
      
      // Get task IDs we're interested in
      // CRITICAL: Use getBaseTaskId to normalize virtual/occurrence IDs to base UUIDs
      // This ensures we match task_completions.task_id which stores base IDs
      const taskIds = rawTasks.map(t => getBaseTaskId(t.id));
      if (taskIds.length === 0) return [];
      
      // Query completions directly - no RPC test needed
      const { data: completionsData, error: completionsError } = await supabase
        .from("task_completions" as any)
        .select("task_id, occurrence_date, completed_by_employee_id, completed_at, completion_mode")
        .in("task_id", taskIds)
        .eq("occurrence_date", targetDayKey);
      
      if (completionsError) {
        if (import.meta.env.DEV) {
          console.log("[useStaffTodayTasks] Completions query error:", completionsError);
        }
        return [];
      }
      
      return (completionsData || []).map((c: any) => ({
        task_id: c.task_id,
        occurrence_date: c.occurrence_date,
        completed_by_employee_id: c.completed_by_employee_id,
        completed_at: c.completed_at,
        completion_mode: c.completion_mode,
      })) as CompletionRecord[];
    },
    enabled: enabled && !!staffContext?.companyId && rawTasks.length > 0,
  });

  // 4. Fetch shifts for coverage
  const { data: shifts = [], isLoading: shiftsLoading } = useShiftCoverage({
    startDate: startOfDay(targetDate),
    endDate: endOfDay(targetDate),
    locationId: staffContext?.locationId || undefined,
    enabled: enabled && !!staffContext?.companyId,
    companyId: staffContext?.companyId,
  });

  // 4b. Fetch location names for employee's shift locations (for display_location_name)
  const myShiftLocationIdsForQuery = useMemo(() => {
    if (!staffContext?.employeeId) return [];
    const locIds: string[] = [];
    for (const shift of shifts) {
      const hasMyAssignment = (shift.shift_assignments || []).some(
        (a) => a.staff_id === staffContext.employeeId &&
          (a.approval_status === "approved" || a.approval_status === "confirmed")
      );
      if (hasMyAssignment && !locIds.includes(shift.location_id)) {
        locIds.push(shift.location_id);
      }
    }
    return locIds;
  }, [shifts, staffContext?.employeeId]);

  const { data: shiftLocationNames = {} } = useQuery({
    queryKey: ["shift-location-names", myShiftLocationIdsForQuery],
    queryFn: async () => {
      if (myShiftLocationIdsForQuery.length === 0) return {};
      const { data } = await supabase
        .from("locations")
        .select("id, name")
        .in("id", myShiftLocationIdsForQuery);
      const map: Record<string, string> = {};
      for (const loc of data || []) {
        map[loc.id] = loc.name;
      }
      return map;
    },
    enabled: myShiftLocationIdsForQuery.length > 0,
  });

  // 5. Run unified pipeline + apply time-lock + apply completions
  const result = useMemo(() => {
    const now = new Date();
    
    // Build completions lookup using shared helper (consistent with kiosk + web)
    const completionsByKey = buildCompletionsMap(completions);
    
    // Run pipeline for today
    const pipelineResult = runPipelineForDate(rawTasks, targetDate, {
      viewMode: "execution",
      includeCompleted: true,
      includeVirtual: true,
      shifts,
      employeeId: staffContext?.employeeId,
    });

    // Filter pipeline tasks to only those at the employee's shift location(s)
    // Uses myShiftLocationIdsForQuery computed above (from employee's approved shift assignments)
    // If no shift assignments found, fall back to showing all (safety net)
    let locationFilteredTasks = pipelineResult.tasks;
    if (myShiftLocationIdsForQuery.length > 0) {
      locationFilteredTasks = pipelineResult.tasks.filter((t) => {
        const taskLocIds = (t as any).task_location_ids as string[] | undefined;
        if (!taskLocIds || taskLocIds.length === 0) return true; // no location info → show
        return taskLocIds.some((locId) => myShiftLocationIdsForQuery.includes(locId));
      });
    } else if (shifts.length > 0) {
      // Shifts exist but employee has no approved assignment → off duty, no tasks
      locationFilteredTasks = [];
    }
    // If shifts.length === 0 → company doesn't use scheduling, show all (backward compat)

    // Resolve display_location_name: find the employee's shift location that overlaps with the task
    const resolveDisplayLocationName = (task: any): string | undefined => {
      if (myShiftLocationIdsForQuery.length === 0) return undefined;
      const taskLocIds = (task.task_location_ids as string[] | undefined) || [];
      // Find the first task location that matches one of the employee's shift locations
      const matchingLocId = taskLocIds.find((locId: string) => myShiftLocationIdsForQuery.includes(locId));
      if (matchingLocId && shiftLocationNames[matchingLocId]) {
        return shiftLocationNames[matchingLocId];
      }
      // If only one shift location, use that
      if (myShiftLocationIdsForQuery.length === 1 && shiftLocationNames[myShiftLocationIdsForQuery[0]]) {
        return shiftLocationNames[myShiftLocationIdsForQuery[0]];
      }
      return undefined;
    };

    // Apply time-lock and completion status to each task
    const tasksWithTimeLock: StaffTaskWithTimeLock[] = locationFilteredTasks.map((task) => {
      const timeLock = getTimeLockStatus(task, now);
      
      // Use shared helper for consistent ID resolution across all surfaces
      const { key: completionKey } = makeCompletionKey(task.id, targetDayKey);
      const completion = completionsByKey.get(completionKey);
      const isOccurrenceCompleted = !!completion;
      
      // If occurrence is completed, mark it
      if (isOccurrenceCompleted && task.status !== "completed") {
        return { 
          ...task, 
          timeLock, 
          isOccurrenceCompleted,
          status: "completed" as any,
          completed_at: completion!.completed_at,
          completed_by_employee_id: completion!.completed_by_employee_id,
          completion_mode: completion!.completion_mode,
          display_location_name: resolveDisplayLocationName(task),
        };
      }
      
      return { ...task, timeLock, isOccurrenceCompleted, display_location_name: resolveDisplayLocationName(task) };
    });

    // Group tasks - but now use occurrence completion status
    const pendingTasks: StaffTaskWithTimeLock[] = [];
    const overdueTasks: StaffTaskWithTimeLock[] = [];
    const completedTasksList: StaffTaskWithTimeLock[] = [];
    const noCoverageTasks: StaffTaskWithTimeLock[] = [];
    
    for (const task of tasksWithTimeLock) {
      // Check coverage first
      if (task.coverage && !task.coverage.hasCoverage) {
        noCoverageTasks.push(task);
        continue;
      }
      
      // Check if completed (either template or occurrence)
      if (task.isOccurrenceCompleted || task.status === "completed") {
        completedTasksList.push(task);
        continue;
      }
      
      // Check if overdue
      const deadline = task.start_at && task.duration_minutes
        ? new Date(new Date(task.start_at).getTime() + task.duration_minutes * 60000)
        : task.due_at ? new Date(task.due_at) : null;
      
      if (deadline && now > deadline) {
        overdueTasks.push(task);
      } else {
        pendingTasks.push(task);
      }
    }
    
    const grouped = {
      pending: pendingTasks,
      overdue: overdueTasks,
      completed: completedTasksList,
      noCoverage: noCoverageTasks,
    };

    // Active = pending + overdue that are unlocked
    const activeTasks = [...grouped.pending, ...grouped.overdue].filter(
      (t) => !t.timeLock || t.timeLock.canComplete
    );

    // Upcoming = pending that are locked
    const upcomingTasks = grouped.pending.filter(
      (t) => t.timeLock && !t.timeLock.canComplete
    );

    // Count coverage reasons
    const coverageReasons = {
      noShift: 0,
      roleMismatch: 0,
      locationMismatch: 0,
      noApprovedAssignments: 0,
      taskRoleNameMissing: 0,
    };
    
    for (const task of pipelineResult.noCoverage) {
      const reason = task.coverage?.noCoverageReason;
      if (reason === "no_shift") coverageReasons.noShift++;
      else if (reason === "role_mismatch") coverageReasons.roleMismatch++;
      else if (reason === "location_mismatch") coverageReasons.locationMismatch++;
      else if (reason === "no_approved_assignments") coverageReasons.noApprovedAssignments++;
      else if (reason === "task_role_name_missing") coverageReasons.taskRoleNameMissing++;
    }

    // Count approved assignments
    const approvedAssignmentsCount = shifts.reduce((acc, s) => {
      return acc + (s.shift_assignments || []).filter(
        (a) => a.approval_status === "approved" || a.approval_status === "confirmed"
      ).length;
    }, 0);

    // Build debug stats
    const debug: StaffTodayDebugStats = {
      employee: staffContext ? {
        id: staffContext.employeeId,
        companyId: staffContext.companyId,
        locationId: staffContext.locationId,
        role: staffContext.role,
        resolvedRoleId: staffContext.resolvedRoleId,
      } : null,
      rawTasksCount: rawTasks.length,
      occurrencesGeneratedCount: pipelineResult.debug.generated,
      shiftsCount: shifts.length,
      approvedAssignmentsCount,
      visibleCount: tasksWithTimeLock.length,
      buckets: {
        pending: grouped.pending.length,
        overdue: grouped.overdue.length,
        completed: grouped.completed.length,
        noCoverage: grouped.noCoverage.length,
      },
      sampleTasks: tasksWithTimeLock.slice(0, 3).map((t) => ({
        title: t.title.slice(0, 25),
        start_at: t.start_at,
        recurrence_type: t.recurrence_type,
        recurrence_days_of_week: t.recurrence_days_of_week,
        assigned_role_id: t.assigned_role_id,
        location_id: t.location_id,
        timeLockStatus: t.timeLock?.canComplete ? "unlocked" : "locked",
      })),
      coverageReasons,
      now: format(now, "HH:mm:ss"),
      todayKey: targetDayKey,
    };

    return {
      todayTasks: tasksWithTimeLock,
      grouped,
      activeTasks,
      upcomingTasks,
      debug,
    };
  }, [rawTasks, shifts, targetDate, staffContext, completions, targetDayKey, myShiftLocationIdsForQuery, shiftLocationNames]);

  return {
    ...result,
    isLoading: contextLoading || tasksLoading || shiftsLoading,
    error: tasksError as Error | null,
    staffContext,
    rawTasks,
    shifts,
  };
}

/**
 * Kiosk-specific variant that fetches tasks for a location's roles
 * (not a single employee)
 */
export function useKioskTodayTasks(options: {
  locationId: string;
  companyId: string;
  targetDate?: Date;
  enabled?: boolean;
  /** Kiosk token for anonymous RPC access */
  kioskToken?: string;
}) {
  const { locationId, companyId, targetDate = getCanonicalToday(), enabled = true, kioskToken } = options;

  // Smart polling: fast when page visible, slow when backgrounded
  const completionsPollInterval = useSmartPolling({ activeInterval: 5000, backgroundInterval: 60000, enabled });
  const legacyPollInterval = useSmartPolling({ activeInterval: 8000, backgroundInterval: 60000, enabled });

  // Fetch all active employees at this location (include user_id for completer mapping)
  const { data: employees = [] } = useQuery({
    queryKey: ["kiosk-employees", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, role, avatar_url, user_id")
        .eq("location_id", locationId)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled,
  });

  // Fetch all tasks for this location (templates only, we'll expand)
  // Now includes role_ids and role_names enrichment for kiosk display consistency
  const { data: rawTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["kiosk-raw-tasks", companyId, locationId, kioskToken || ""],
    queryFn: async () => {
      // Anonymous kiosk must not rely on direct table SELECT (RLS may hide completed templates).
      // Use the SECURITY DEFINER RPC when kioskToken is present.
      if (kioskToken) {
        const { data, error } = await supabase.rpc("get_kiosk_tasks", {
          p_token: kioskToken,
          p_location_id: locationId,
          p_company_id: companyId,
        });

        if (error) {
          if (import.meta.env.DEV) {
            console.error("[useKioskTodayTasks] get_kiosk_tasks RPC failed", {
              code: error.code,
              message: error.message,
              companyId,
              locationId,
            });
          }
          return [];
        }

        const rpcTasks = (data || []).map((t: any) => ({
          ...t,
          role_ids: t.role_ids || [],
          role_names: t.role_names || [],
        }));

        // Enrich with task_location_ids from junction table (same pattern as staff path)
        const rpcTaskIds = rpcTasks.map((t: any) => t.id);
        let rpcLocMap: Record<string, string[]> = {};
        if (rpcTaskIds.length > 0) {
          const { data: tlData } = await supabase
            .from("task_locations")
            .select("task_id, location_id")
            .in("task_id", rpcTaskIds);
          if (tlData) {
            for (const tl of tlData) {
              if (!rpcLocMap[tl.task_id]) rpcLocMap[tl.task_id] = [];
              rpcLocMap[tl.task_id].push(tl.location_id);
            }
          }
        }

        return rpcTasks.map((t: any) => ({
          ...t,
          task_location_ids: rpcLocMap[t.id] || (t.location_id ? [t.location_id] : []),
          task_role_ids: t.role_ids || [],
          task_role_names: t.role_names || [],
        })) as Task[];
      }

      // A) Tasks via task_locations junction
      const { data: taskLocations } = await supabase
        .from("task_locations")
        .select("task_id")
        .eq("location_id", locationId);
      
      const taskIdsFromLocations = (taskLocations || []).map((tl) => tl.task_id);
      
      // B) Direct location_id on tasks
      const { data: directTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("company_id", companyId)
        .eq("location_id", locationId);
      
      const taskIdsFromDirect = (directTasks || []).map((t: any) => t.id);
      
      // C) Role-based tasks for employees at this location (global role tasks)
      // Find roles used by employees at this location
      const { data: employeesAtLoc } = await supabase
        .from("employees")
        .select("role")
        .eq("location_id", locationId);
      
      const employeeRoles = [...new Set((employeesAtLoc || []).map((e: any) => e.role).filter(Boolean))];
      
      let roleIds: string[] = [];
      if (employeeRoles.length > 0) {
        const { data: roles } = await supabase
          .from("employee_roles")
          .select("id, name")
          .eq("company_id", companyId);
        
        roleIds = (roles || [])
          .filter((r: any) => employeeRoles.some((er: string) => 
            er.toLowerCase().trim() === r.name.toLowerCase().trim()
          ))
          .map((r: any) => r.id);
      }
      
      // Fetch global role-based tasks (no location but assigned to roles at this location)
      let globalRoleTaskIds: string[] = [];
      if (roleIds.length > 0) {
        const { data: globalRoleTasks } = await supabase
          .from("tasks")
          .select("id")
          .eq("company_id", companyId)
          .is("location_id", null)
          .is("assigned_to", null)
          .in("assigned_role_id", roleIds);
        
        globalRoleTaskIds = (globalRoleTasks || []).map((t: any) => t.id);
      }
      
      // Also check task_roles junction for multi-role tasks
      if (roleIds.length > 0) {
        const { data: kioskJunctionMatches } = await supabase
          .from("task_roles")
          .select("task_id")
          .in("role_id", roleIds);

        const kioskJunctionTaskIds = (kioskJunctionMatches || [])
          .map((tr: any) => tr.task_id)
          .filter((id: string) => !globalRoleTaskIds.includes(id));

        if (kioskJunctionTaskIds.length > 0) {
          const { data: junctionGlobalTasks } = await supabase
            .from("tasks")
            .select("id")
            .eq("company_id", companyId)
            .is("assigned_to", null)
            .in("id", kioskJunctionTaskIds);

          globalRoleTaskIds = [...globalRoleTaskIds, ...(junctionGlobalTasks || []).map((t: any) => t.id)];
        }
      }
      
      const allTaskIds = [...new Set([...taskIdsFromLocations, ...taskIdsFromDirect, ...globalRoleTaskIds])];
      
      if (!allTaskIds.length) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          location:locations(id, name),
          assigned_role:employee_roles(id, name)
        `)
        .in("id", allTaskIds);
      
      if (error) throw error;
      if (!data?.length) return [];

      // Get role assignments from task_roles table (for multi-role support)
      const { data: taskRoles } = await supabase
        .from("task_roles")
        .select("task_id, role_id")
        .in("task_id", data.map((t: any) => t.id));

      // Collect all role IDs from both sources
      const directRoleIds = data.map((t: any) => t.assigned_role_id).filter(Boolean);
      const taskRoleIds = (taskRoles || []).map((tr: any) => tr.role_id);
      const allRoleIds = [...new Set([...directRoleIds, ...taskRoleIds])];
      
      let roleMap: Record<string, string> = {};
      
      if (allRoleIds.length > 0) {
        const { data: roles } = await supabase
          .from("employee_roles")
          .select("id, name")
          .in("id", allRoleIds);
        
        if (roles) {
          roleMap = Object.fromEntries(roles.map((r: any) => [r.id, r.name]));
        }
      }

      // Enrich with task_location_ids from junction table
      const enrichTaskIds = data.map((t: any) => t.id);
      let kioskLocMap: Record<string, string[]> = {};
      if (enrichTaskIds.length > 0) {
        const { data: tlData } = await supabase
          .from("task_locations")
          .select("task_id, location_id")
          .in("task_id", allTaskIds);
        if (tlData) {
          for (const tl of tlData) {
            if (!kioskLocMap[tl.task_id]) kioskLocMap[tl.task_id] = [];
            kioskLocMap[tl.task_id].push(tl.location_id);
          }
        }
      }

      // Attach role and location enrichment to tasks
      return data.map((task: any) => {
        const taskRoleEntries = (taskRoles || []).filter((tr: any) => tr.task_id === task.id);
        
        const roleIds: string[] = [];
        const roleNames: string[] = [];
        
        // Primary role from assigned_role_id
        if (task.assigned_role_id && roleMap[task.assigned_role_id]) {
          roleIds.push(task.assigned_role_id);
          roleNames.push(roleMap[task.assigned_role_id]);
        }
        
        // Additional roles from task_roles table
        taskRoleEntries.forEach((tr: any) => {
          if (!roleIds.includes(tr.role_id) && roleMap[tr.role_id]) {
            roleIds.push(tr.role_id);
            roleNames.push(roleMap[tr.role_id]);
          }
        });
        
        return {
          ...task,
          role_ids: roleIds,
          role_names: roleNames,
          task_role_ids: roleIds,
          task_role_names: roleNames,
          task_location_ids: kioskLocMap[task.id] || (task.location_id ? [task.location_id] : []),
        };
      }) as Task[];
    },
    enabled,
  });

  const targetDayKey = toDayKey(targetDate);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);
  const dayStartISO = dayStart.toISOString();
  const dayEndISO = dayEnd.toISOString();

  // ======================================================================
  // STABLE TASK IDS for robust query keys (fixes stale data issues)
  // Uses getBaseTaskId to normalize any virtual/occurrence IDs
  // ======================================================================
  const taskIds = useMemo(() => 
    (rawTasks ?? []).map((t: any) => getBaseTaskId(t.id)).filter(Boolean), 
    [rawTasks]
  );
  const taskIdsKey = useMemo(() => [...taskIds].sort().join(","), [taskIds]);
  const taskIdSet = useMemo(() => new Set(taskIds), [taskIds]);

  // Fetch per-occurrence completions for kiosk view (from task_completions table)
  // CRITICAL: Kiosk is anonymous, so we use a SECURITY DEFINER RPC to bypass RLS
  // POLLING: refetch every 3s to catch completions from mobile/web
  const { data: completions = [], isLoading: completionsLoading } = useQuery({
    queryKey: ["kiosk-task-completions", companyId, locationId, targetDayKey, taskIdsKey, kioskToken],
    queryFn: async (): Promise<CompletionRecord[]> => {
      if (taskIds.length === 0) return [];
      
      // Use RPC for anonymous kiosk access (bypasses RLS via SECURITY DEFINER)
      if (kioskToken) {
        const { data, error } = await supabase.rpc("get_kiosk_task_completions", {
          p_token: kioskToken,
          p_location_id: locationId,
          p_company_id: companyId,
          p_occurrence_date: targetDayKey,
          p_task_ids: taskIds,
        });
        
        if (error) {
          if (import.meta.env.DEV) {
            console.error("[KIOSK completions RPC] failed", {
              code: error.code,
              message: error.message,
              companyId,
              locationId,
              targetDayKey,
              taskIdsCount: taskIds.length,
            });
          }
          return [];
        }
        
        const completions = (data || []).map((c: any) => ({
          task_id: c.task_id,
          occurrence_date: c.occurrence_date,
          completed_by_employee_id: c.completed_by_employee_id,
          completed_at: c.completed_at,
          completion_mode: c.completion_mode,
        }));
        
        if (import.meta.env.DEV) {
          console.log("[KIOSK completions RPC] fetch result", {
            targetDayKey,
            taskIdsCount: taskIds.length,
            completionsFetchedCount: completions.length,
          });
        }
        
        return completions;
      }
      
      // Fallback: direct query for authenticated users (non-kiosk contexts)
      const { data, error } = await supabase
        .from("task_completions" as any)
        .select("task_id, occurrence_date, completed_by_employee_id, completed_at, completion_mode")
        .in("task_id", taskIds)
        .eq("occurrence_date", targetDayKey);
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error("[KIOSK completions direct] failed", {
            code: error.code,
            message: error.message,
          });
        }
        return [];
      }
      
      return (data || []).map((c: any) => ({
        task_id: c.task_id,
        occurrence_date: c.occurrence_date,
        completed_by_employee_id: c.completed_by_employee_id,
        completed_at: c.completed_at,
        completion_mode: c.completion_mode,
      }));
    },
    enabled: enabled && taskIds.length > 0,
    refetchInterval: completionsPollInterval,
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    // CRITICAL: Keep previous completions data when queryKey changes (e.g. taskIdsKey
    // recomputes during rawTasks refetch). Without this, completions briefly becomes []
    // causing overdue banner to flash for ~1s before new data arrives.
    placeholderData: (prev: CompletionRecord[] | undefined) => prev ?? [],
  });

  // ======================================================================
  // CRITICAL: Query LEGACY completed tasks for today DIRECTLY from tasks table.
  // This ensures we count tasks that were completed today even if they're
  // not in rawTasks (e.g., already marked completed at template level).
  // POLLING: refetch every 8s to catch legacy completions
  // ======================================================================
  const { data: legacyCompletedTasks = [] } = useQuery({
    queryKey: ["kiosk-legacy-completed", companyId, locationId, targetDayKey],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          location:locations(id, name),
          assigned_role:employee_roles(id, name)
        `)
        .eq("company_id", companyId)
        .eq("location_id", locationId)
        .eq("status", "completed")
        .gte("completed_at", dayStartISO)
        .lt("completed_at", dayEndISO);
      
      if (error) {
        if (import.meta.env.DEV) {
          console.log("[useKioskTodayTasks] Legacy completed query error:", error);
        }
        return [];
      }
      
      return (data || []) as Task[];
    },
    enabled,
    refetchInterval: legacyPollInterval,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  // ======================================================================
  // REALTIME: Subscribe to task_completions + tasks changes to invalidate
  // kiosk queries immediately when staff completes tasks on mobile/web.
  // Uses taskIdSet to filter to only relevant task completions.
  // ======================================================================
  const queryClient = useQueryClient();
  const lastInvalidateRef = useRef<number>(0);
  
  useEffect(() => {
    if (!enabled || !companyId || !locationId || !targetDayKey) return;
    if (taskIds.length === 0) return;

    // Invalidate helper for all kiosk-related queries
    const invalidateKiosk = () => {
      // Throttle invalidations to avoid spam when multiple rows change quickly
      const nowMs = Date.now();
      if (nowMs - lastInvalidateRef.current < 750) return;
      lastInvalidateRef.current = nowMs;

      if (import.meta.env.DEV) {
        console.log("[KIOSK REALTIME] Invalidating queries for:", { companyId, locationId, targetDayKey });
      }
      // CRITICAL: Use exact: false to match all kiosk-task-completions variants
      queryClient.invalidateQueries({ 
        queryKey: ["kiosk-task-completions", companyId, locationId, targetDayKey],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["kiosk-legacy-completed", companyId, locationId, targetDayKey] });
      // Also invalidate the main kiosk tasks to force re-render
      queryClient.invalidateQueries({ 
        queryKey: ["kiosk-raw-tasks", companyId, locationId],
        exact: false,
      });
    };

    // Subscribe to per-occurrence completions (main source of truth)
    const channel = supabase
      .channel(`kiosk-completions-${companyId}-${locationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_completions",
        },
        (payload) => {
          // We only care about this kiosk/location/day; cheap checks to avoid noise
          const row: any = payload.new ?? payload.old;
          if (!row) return;

          // Filter to only this occurrence date
          if (row.occurrence_date && row.occurrence_date !== targetDayKey) return;
          
          // CRITICAL: Normalize task_id with getBaseTaskId before membership check
          // (in case payload contains virtual/occurrence ID format)
          const normalizedTaskId = row.task_id ? getBaseTaskId(row.task_id) : null;
          if (normalizedTaskId && !taskIdSet.has(normalizedTaskId)) return;

          if (import.meta.env.DEV) {
            console.log("[KIOSK REALTIME] task_completions change:", { 
              taskId: normalizedTaskId, 
              occurrenceDate: row.occurrence_date,
              event: payload.eventType,
            });
          }
          invalidateKiosk();
        }
      )
      // Legacy fallback: some completions may still update tasks table
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          const row: any = payload.new;
          if (!row) return;

          // Only invalidate if completion fields changed (keeps it minimal)
          if (row.completed_at || row.status === "completed") {
            // If tasks has location_id, filter to kiosk location where possible
            if (row.location_id && row.location_id !== locationId) return;
            
            if (import.meta.env.DEV) {
              console.log("[KIOSK REALTIME] tasks completion change:", row);
            }
            invalidateKiosk();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, companyId, locationId, targetDayKey, taskIds.length, taskIdSet, queryClient, kioskToken]);

  // Fetch shifts for coverage
  const { data: shifts = [], isLoading: shiftsLoading } = useShiftCoverage({
    startDate: startOfDay(targetDate),
    endDate: endOfDay(targetDate),
    locationId,
    enabled,
    companyId,
  });

  // Run pipeline
  const result = useMemo(() => {
    const now = new Date();
    
    // Build completions map using shared helper (consistent with mobile + web)
    const completionsByKey = buildCompletionsMap(completions);
    
    const pipelineResult = runPipelineForDate(rawTasks, targetDate, {
      viewMode: "execution",
      includeCompleted: true,
      includeVirtual: true,
      shifts,
    });

    // Apply time-lock and completion status
    const tasksWithTimeLock: StaffTaskWithTimeLock[] = pipelineResult.tasks.map((task) => {
      const timeLock = getTimeLockStatus(task, now);
      
      const { baseTaskId, occurrenceDate, key: completionKey } = makeCompletionKey(task.id, targetDayKey);
      
      const completion = completionsByKey.get(completionKey);
      const isOccurrenceCompleted = !!completion;
      
      if (isOccurrenceCompleted && task.status !== "completed") {
        return { 
          ...task, 
          timeLock, 
          isOccurrenceCompleted,
          status: "completed" as any,
          completed_at: completion!.completed_at,
          // CRITICAL: Attach completed_by_employee_id for Champions attribution
          completed_by_employee_id: completion!.completed_by_employee_id,
          completion_mode: completion!.completion_mode,
        };
      }

      // Legacy completed tasks (from tasks table) still need completer attribution.
      // Only treat as "completed today" if completed_at is on the target day.
      if (task.status === "completed" && task.completed_at) {
        const completedDayKey = toDayKey(new Date(task.completed_at));
        if (completedDayKey === occurrenceDate) {
          const legacyCompleter =
            (task as any).completed_by_employee_id ??
            (task as any).completed_by ??
            (task as any).completed_by?.id ??
            null;
          return {
            ...task,
            timeLock,
            isOccurrenceCompleted,
            completed_by_employee_id: legacyCompleter,
          } as StaffTaskWithTimeLock;
        }
      }
      
      // For already-completed template tasks, still attach completion metadata if available
      if (completion) {
        return {
          ...task,
          timeLock,
          isOccurrenceCompleted,
          completed_by_employee_id: completion.completed_by_employee_id,
          completion_mode: completion.completion_mode,
        } as StaffTaskWithTimeLock;
      }
      
      return { ...task, timeLock, isOccurrenceCompleted } as StaffTaskWithTimeLock;
    });

    // =========================================================
    // COMPLETED TODAY (KPI + Champions)
    // IMPORTANT: this must include completions for TODAY even if
    // the task was due earlier (backlog completion).
    // Sources:
    // 1) task_completions (per-occurrence) - preferred
    // 2) legacy tasks.completed_* (from legacyCompletedTasks query) 
    // =========================================================
    const completedByCompositeKey = new Map<string, StaffTaskWithTimeLock>();
    const completionsFromTableCount = completions.filter(
      (c) => c.occurrence_date === targetDayKey
    ).length;
    
    // Source 1: Per-occurrence completions from task_completions table
    for (const c of completions) {
      if (c.occurrence_date !== targetDayKey) continue;
      // CRITICAL: Normalize both sides when finding template - rawTasks may have virtual IDs
      // while c.task_id from task_completions is always a base UUID
      const normalizedTaskId = getBaseTaskId(c.task_id);
      const tpl = rawTasks.find((t) => getBaseTaskId(t.id) === normalizedTaskId);
      // Even if template not found, still count the completion for KPI
      const taskTitle = tpl?.title || "(Unknown task)";

      const compositeKey = `${c.task_id}:${c.occurrence_date}`;
      completedByCompositeKey.set(compositeKey, {
        ...(tpl || { id: c.task_id, title: taskTitle } as any),
        id: `${c.task_id}-completed-${c.occurrence_date}`,
        status: "completed" as any,
        isOccurrenceCompleted: true,
        completed_at: c.completed_at,
        completed_by_employee_id: c.completed_by_employee_id,
        completion_mode: c.completion_mode,
      } as StaffTaskWithTimeLock);
    }

    // Source 2: Legacy completed tasks from the direct query (NOT dependent on rawTasks)
    let legacyCompletedTodayCount = 0;
    for (const t of legacyCompletedTasks) {
      // Already filtered to today in the query, but double-check
      if (t.status !== "completed" || !t.completed_at) continue;
      const completedDayKey = toDayKey(new Date(t.completed_at));
      if (completedDayKey !== targetDayKey) continue;

      const legacyCompleter =
        (t as any).completed_by_employee_id ??
        (t as any).completed_by ??
        ((t as any).completed_by && typeof (t as any).completed_by === 'object' 
          ? (t as any).completed_by.id 
          : null) ??
        null;

      const { baseTaskId, key: compositeKey } = makeCompletionKey(t.id, targetDayKey);
      if (completedByCompositeKey.has(compositeKey)) continue; // avoid double counting

      legacyCompletedTodayCount++;
      completedByCompositeKey.set(compositeKey, {
        ...(t as any),
        id: `${baseTaskId}-completed-${targetDayKey}`,
        status: "completed" as any,
        isOccurrenceCompleted: false,
        completed_by_employee_id: legacyCompleter,
      } as StaffTaskWithTimeLock);
    }

    // Also check rawTasks for legacy completions (in case legacyCompletedTasks query missed some)
    for (const t of rawTasks) {
      if (t.status !== "completed" || !t.completed_at) continue;
      const completedDayKey = toDayKey(new Date(t.completed_at));
      if (completedDayKey !== targetDayKey) continue;

      const legacyCompleter =
        (t as any).completed_by_employee_id ??
        (t as any).completed_by ??
        ((t as any).completed_by && typeof (t as any).completed_by === 'object' 
          ? (t as any).completed_by.id 
          : null) ??
        null;

      const { baseTaskId, key: compositeKey } = makeCompletionKey(t.id, targetDayKey);
      if (completedByCompositeKey.has(compositeKey)) continue; // avoid double counting

      legacyCompletedTodayCount++;
      completedByCompositeKey.set(compositeKey, {
        ...(t as any),
        id: `${baseTaskId}-completed-${targetDayKey}`,
        status: "completed" as any,
        isOccurrenceCompleted: false,
        completed_by_employee_id: legacyCompleter,
      } as StaffTaskWithTimeLock);
    }

    const completedToday = Array.from(completedByCompositeKey.values());
    const completedMissingCompleter = completedToday.filter(
      (t) => !(t as any).completed_by_employee_id
    );

    // Re-group for task LIST behavior (unchanged), and plug-in completedToday for KPI/Champions.
    const groupedWithTimeLock = {
      pending: tasksWithTimeLock.filter(
        (t) =>
          !t.isOccurrenceCompleted &&
          t.status !== "completed" &&
          t.coverage?.hasCoverage !== false
      ),
      overdue: tasksWithTimeLock.filter((t) => {
        if (t.isOccurrenceCompleted || t.status === "completed") return false;
        const deadline =
          t.start_at && t.duration_minutes
            ? new Date(
                new Date(t.start_at).getTime() + t.duration_minutes * 60000
              )
            : t.due_at
              ? new Date(t.due_at)
              : null;
        return !!(deadline && now > deadline);
      }),
      completed: completedToday,
      noCoverage: tasksWithTimeLock.filter((t) => t.coverage?.hasCoverage === false),
    };

    // Build debug stats
    const debug = {
      rawTasksCount: rawTasks.length,
      generatedCount: pipelineResult.debug.generated,
      shiftsCount: shifts.length,
      visibleCount: tasksWithTimeLock.length,
      completionsCount: completions.length,
      completionsFromTableCount,
      legacyCompletedTodayCount,
      legacyCompletedQueryCount: legacyCompletedTasks.length,
      completedTodayTotal: completedToday.length,
      completedMissingCompleterCount: completedMissingCompleter.length,
      sampleMissingCompleterTitles: completedMissingCompleter
        .slice(0, 5)
        .map((t) => t.title),
      now: format(now, "HH:mm:ss"),
      todayKey: targetDayKey,
    };

    // DEV-only diagnostic log for kiosk live updates
    if (import.meta.env.DEV) {
      console.log("[KIOSK LIVE]", {
        companyId,
        locationId,
        targetDayKey,
        completedToday: completedToday.length,
        now: new Date().toISOString(),
      });
    }

    return {
      todayTasks: tasksWithTimeLock,
      grouped: groupedWithTimeLock,
      employees,
      debug,
    };
  }, [rawTasks, shifts, targetDate, employees, completions, legacyCompletedTasks, targetDayKey]);

  return {
    ...result,
    isLoading: tasksLoading || shiftsLoading || completionsLoading,
    completionsLoading,
    rawTasks,
    shifts,
  };
}
