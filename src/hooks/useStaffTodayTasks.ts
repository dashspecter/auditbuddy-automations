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
 * 4. Expand recurring tasks into occurrences for target date
 * 5. Fetch shifts and apply coverage filtering
 * 6. Apply time-lock rules for task completion
 */

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  getCompanyWeekday,
  getCompanyDayKey,
  normalizeDaysOfWeek,
} from "@/lib/taskOccurrenceEngine";
import { getCompanyDayWindow, toDayKey, normalizeRoleName, rolesMatch } from "@/lib/companyDayUtils";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { getTimeLockStatus, TimeLockStatus } from "@/lib/taskTimeLock";

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
  /** Active tasks (pending, started) */
  activeTasks: StaffTaskWithTimeLock[];
  /** Upcoming tasks (not yet unlocked) */
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
    queryKey: ["staff-today-tasks", staffContext?.companyId, staffContext?.employeeId, toDayKey(targetDate)],
    queryFn: async () => {
      if (!staffContext?.companyId) return [];
      
      const { employeeId, companyId, locationId, resolvedRoleId, role } = staffContext;
      
      // A) Direct assignments
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
        // Primary location tasks
        const locationFilter = locationId ? [locationId] : [];
        
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
        
        // Global tasks (no location)
        const { data: globalTasks } = await supabase
          .from("tasks")
          .select(`
            *,
            location:locations(id, name),
            assigned_role:employee_roles(id, name)
          `)
          .eq("company_id", companyId)
          .eq("assigned_role_id", resolvedRoleId)
          .is("location_id", null)
          .is("assigned_to", null);
        
        roleTasks = [...roleTasks, ...(globalTasks || [])];
      }
      
      // Combine and deduplicate
      const allTasks = [...(directTasks || []), ...roleTasks];
      const uniqueTasks = allTasks.filter(
        (task, index, self) => index === self.findIndex((t) => t.id === task.id)
      );
      
      if (import.meta.env.DEV) {
        console.log("[useStaffTodayTasks] Fetched tasks:", {
          direct: directTasks?.length || 0,
          role: roleTasks.length,
          unique: uniqueTasks.length,
        });
      }
      
      return uniqueTasks as Task[];
    },
    enabled: enabled && !!staffContext?.companyId,
  });

  // 3. Fetch shifts for coverage
  const { data: shifts = [], isLoading: shiftsLoading } = useShiftCoverage({
    startDate: startOfDay(targetDate),
    endDate: endOfDay(targetDate),
    locationId: staffContext?.locationId || undefined,
    enabled: enabled && !!staffContext?.companyId,
    companyId: staffContext?.companyId,
  });

  // 4. Run unified pipeline + apply time-lock
  const result = useMemo(() => {
    const now = new Date();
    
    // Run pipeline for today
    const pipelineResult = runPipelineForDate(rawTasks, targetDate, {
      viewMode: "execution",
      includeCompleted: true,
      includeVirtual: true,
      shifts,
      employeeId: staffContext?.employeeId,
    });

    // Apply time-lock to each task
    const tasksWithTimeLock: StaffTaskWithTimeLock[] = pipelineResult.tasks.map((task) => {
      const timeLock = getTimeLockStatus(task, now);
      return { ...task, timeLock };
    });

    // Group tasks - cast to our extended type
    const baseGrouped = groupTasksByStatusShiftAware(pipelineResult.tasks);
    
    // Map to include time-lock status
    const mapWithTimeLock = (tasks: TaskWithCoverage[]): StaffTaskWithTimeLock[] => 
      tasks.map((t) => {
        const timeLock = getTimeLockStatus(t, now);
        return { ...t, timeLock } as StaffTaskWithTimeLock;
      });
    
    const grouped = {
      pending: mapWithTimeLock(baseGrouped.pending),
      overdue: mapWithTimeLock(baseGrouped.overdue),
      completed: mapWithTimeLock(baseGrouped.completed),
      noCoverage: mapWithTimeLock(baseGrouped.noCoverage),
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
    };

    return {
      todayTasks: tasksWithTimeLock,
      grouped,
      activeTasks,
      upcomingTasks,
      debug,
    };
  }, [rawTasks, shifts, targetDate, staffContext]);

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
}) {
  const { locationId, companyId, targetDate = getCanonicalToday(), enabled = true } = options;

  // Fetch all active employees at this location
  const { data: employees = [] } = useQuery({
    queryKey: ["kiosk-employees", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, role, avatar_url")
        .eq("location_id", locationId)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled,
  });

  // Fetch all tasks for this location (templates only, we'll expand)
  const { data: rawTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["kiosk-raw-tasks", companyId, locationId],
    queryFn: async () => {
      // Tasks via task_locations
      const { data: taskLocations } = await supabase
        .from("task_locations")
        .select("task_id")
        .eq("location_id", locationId);
      
      const taskIdsFromLocations = (taskLocations || []).map((tl) => tl.task_id);
      
      // Direct location_id on tasks
      const { data: directTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("location_id", locationId);
      
      const taskIdsFromDirect = (directTasks || []).map((t: any) => t.id);
      const allTaskIds = [...new Set([...taskIdsFromLocations, ...taskIdsFromDirect])];
      
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
      return data as Task[];
    },
    enabled,
  });

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
    
    const pipelineResult = runPipelineForDate(rawTasks, targetDate, {
      viewMode: "execution",
      includeCompleted: true,
      includeVirtual: true,
      shifts,
      locationId,
    });

    // Apply time-lock
    const tasksWithTimeLock: StaffTaskWithTimeLock[] = pipelineResult.tasks.map((task) => {
      const timeLock = getTimeLockStatus(task, now);
      return { ...task, timeLock } as StaffTaskWithTimeLock;
    });

    const grouped = groupTasksByStatusShiftAware(pipelineResult.tasks);
    
    // Map grouped tasks to include timeLock
    const groupedWithTimeLock = {
      pending: grouped.pending.map((t) => ({ ...t, timeLock: getTimeLockStatus(t, now) })) as StaffTaskWithTimeLock[],
      overdue: grouped.overdue.map((t) => ({ ...t, timeLock: getTimeLockStatus(t, now) })) as StaffTaskWithTimeLock[],
      completed: grouped.completed.map((t) => ({ ...t, timeLock: getTimeLockStatus(t, now) })) as StaffTaskWithTimeLock[],
      noCoverage: grouped.noCoverage.map((t) => ({ ...t, timeLock: getTimeLockStatus(t, now) })) as StaffTaskWithTimeLock[],
    };

    return {
      todayTasks: tasksWithTimeLock,
      grouped: groupedWithTimeLock,
      employees,
    };
  }, [rawTasks, shifts, targetDate, employees]);

  return {
    ...result,
    isLoading: tasksLoading || shiftsLoading,
    rawTasks,
    shifts,
  };
}
