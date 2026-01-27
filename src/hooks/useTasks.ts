import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";

/**
 * Resolve virtual task IDs (e.g., "uuid-virtual-2024-01-21") to real task IDs
 * Inline to avoid circular dependency with taskOccurrenceEngine
 */
const resolveTaskId = (id: string): string => {
  const match = id.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match ? match[1] : id;
};

export interface Task {
  id: string;
  company_id: string;
  location_id: string | null;
  title: string;
  description: string | null;
  created_by: string;
  assigned_to: string | null;
  assigned_role_id: string | null;
  due_at: string | null;
  start_at: string | null;
  duration_minutes: number | null;
  completed_at: string | null;
  completed_by: string | null;
  completed_late: boolean | null;
  status: string;
  priority: string;
  source: string;
  source_reference_id: string | null;
  created_at: string;
  updated_at: string;
  // Recurrence fields
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence_days_of_week: number[] | null;
  recurrence_days_of_month: number[] | null;
  parent_task_id: string | null;
  is_recurring_instance: boolean | null;
  is_individual: boolean | null;
  // Execution mode for shift-aware tasks
  execution_mode?: 'shift_based' | 'always_on';
  // Joined data
  assigned_employee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  completed_employee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  assigned_role?: {
    id: string;
    name: string;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
}

export const useTasks = (filters?: { status?: string; assignedTo?: string; locationId?: string; assignedRoleId?: string }) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["tasks", company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("tasks")
        .select(`
          *,
          location:locations(id, name),
          assigned_role:employee_roles(id, name)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.assignedTo) {
        query = query.eq("assigned_to", filters.assignedTo);
      }

      if (filters?.assignedRoleId) {
        query = query.eq("assigned_role_id", filters.assignedRoleId);
      }

      if (filters?.locationId) {
        query = query.eq("location_id", filters.locationId);
      }

      const { data: tasks, error } = await query;

      if (error) throw error;

      // Fetch assigned and completed employees separately
      const tasksWithAssignees = await Promise.all(
        (tasks || []).map(async (task) => {
          let assigned_employee = null;
          let completed_employee = null;
          
          if (task.assigned_to) {
            const { data: emp } = await supabase
              .from("employees")
              .select("id, full_name, avatar_url")
              .eq("id", task.assigned_to)
              .single();
            assigned_employee = emp;
          }
          
          if (task.completed_by) {
            const { data: emp } = await supabase
              .from("employees")
              .select("id, full_name, avatar_url")
              .eq("id", task.completed_by)
              .single();
            completed_employee = emp;
          }
          
          return { ...task, assigned_employee, completed_employee } as Task;
        })
      );

      return tasksWithAssignees;
    },
    enabled: !!company?.id,
  });
};

export const useMyTasks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get the employee record for the current user - this gives us company_id
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("id, role, location_id, company_id")
        .eq("user_id", user.id)
        .single();

      if (empError) {
        console.error("[useMyTasks] Error fetching employee:", empError);
        return [];
      }

      if (!employee) {
        console.log("[useMyTasks] No employee record found for user:", user.id);
        return [];
      }
      
      const companyId = employee.company_id;
      if (!companyId) {
        console.log("[useMyTasks] No company_id for employee");
        return [];
      }
      
      console.log("[useMyTasks] Loading tasks for employee:", { 
        employeeId: employee.id, 
        role: employee.role, 
        locationId: employee.location_id,
        companyId 
      });

      // Get today's date using canonical day window (avoids UTC/local mismatch)
      const { toDayKey, getCompanyDayWindow } = await import("@/lib/companyDayUtils");
      const todayWindow = getCompanyDayWindow();
      const today = todayWindow.dayKey;

      // Check if employee has a shift today
      const { data: todayShifts } = await supabase
        .from("shift_assignments")
        .select(`
          id,
          shifts!inner(shift_date, location_id)
        `)
        .eq("staff_id", employee.id)
        .eq("approval_status", "approved")
        .eq("shifts.shift_date", today);

      const hasShiftToday = !!(todayShifts && todayShifts.length > 0);
      const shiftLocationIds =
        todayShifts?.map((s: any) => s.shifts?.location_id).filter(Boolean) || [];

      // Always include employee's primary location as a fallback
      const activeLocationIds = Array.from(
        new Set([...(shiftLocationIds || []), employee.location_id].filter(Boolean))
      );

      if (import.meta.env.DEV) {
        console.log("[useMyTasks] Shift check:", {
          today,
          hasShiftToday,
          shiftCount: todayShifts?.length || 0,
          shiftLocationIds,
          activeLocationIds,
        });
      }

      // Fetch tasks directly assigned to this employee (including completed so they can revisit)
      const { data: directTasks, error: directError } = await supabase
        .from("tasks")
        .select(`
          *,
          location:locations(id, name),
          assigned_role:employee_roles(id, name)
        `)
        .eq("company_id", companyId)
        .eq("assigned_to", employee.id)
        .order("due_at", { ascending: true, nullsFirst: false });

      if (directError) throw directError;

      // Also fetch tasks that were completed by this employee (even if not directly assigned)
      const { data: completedByMeTasks, error: completedError } = await supabase
        .from("tasks")
        .select(`
          *,
          location:locations(id, name),
          assigned_role:employee_roles(id, name)
        `)
        .eq("company_id", companyId)
        .eq("completed_by", employee.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (completedError) throw completedError;

      // Fetch tasks assigned to employee's role (only if has shift today)
      let roleTasks: any[] = [];
      if (hasShiftToday && employee.role) {
        // Fetch roles for the company and match in JS (avoids .single() 406 + handles case/whitespace)
        const { data: rolesForCompany, error: rolesError } = await supabase
          .from("employee_roles")
          .select("id, name")
          .eq("company_id", companyId);

        if (rolesError) {
          if (import.meta.env.DEV) console.error("[useMyTasks] employee_roles error:", rolesError);
        }

        const normalizedEmployeeRole = String(employee.role).trim().toLowerCase();
        const matchingRole = (rolesForCompany || []).find(
          (r) => String(r.name).trim().toLowerCase() === normalizedEmployeeRole
        );

        if (import.meta.env.DEV) {
          console.log("[useMyTasks] Role matching:", {
            employeeRole: employee.role,
            normalizedEmployeeRole,
            matchingRole,
            rolesCount: rolesForCompany?.length || 0,
          });
        }

        if (matchingRole) {
          // Multi-location support: tasks can be attached via task_locations
          const { data: taskLocationRows, error: taskLocError } = await supabase
            .from("task_locations")
            .select("task_id")
            .in("location_id", activeLocationIds);

          if (taskLocError && import.meta.env.DEV) {
            console.error("[useMyTasks] task_locations error:", taskLocError);
          }

          const locationTaskIds = Array.from(
            new Set((taskLocationRows || []).map((r) => r.task_id).filter(Boolean))
          );

          const baseRoleTaskSelect = `
            *,
            location:locations(id, name),
            assigned_role:employee_roles(id, name)
          `;

          // === DUAL-QUERY APPROACH: Fetch non-completed + completed recurring separately ===
          // Query A: Non-completed tasks (primary location)
          const { data: primaryNonCompleted, error: primaryNonCompletedErr } = await supabase
            .from("tasks")
            .select(baseRoleTaskSelect)
            .eq("company_id", companyId)
            .eq("assigned_role_id", matchingRole.id)
            .in("location_id", activeLocationIds)
            .is("assigned_to", null)
            .neq("status", "completed")
            .order("due_at", { ascending: true, nullsFirst: false });

          // Query B: Completed recurring templates only (primary location)
          const { data: primaryCompletedRecurring, error: primaryCompletedRecurringErr } = await supabase
            .from("tasks")
            .select(baseRoleTaskSelect)
            .eq("company_id", companyId)
            .eq("assigned_role_id", matchingRole.id)
            .in("location_id", activeLocationIds)
            .is("assigned_to", null)
            .eq("status", "completed")
            .not("recurrence_type", "is", null)
            .neq("recurrence_type", "none")
            .order("due_at", { ascending: true, nullsFirst: false });

          if ((primaryNonCompletedErr || primaryCompletedRecurringErr) && import.meta.env.DEV) {
            console.error("[useMyTasks] Primary fetch errors:", { primaryNonCompletedErr, primaryCompletedRecurringErr });
          }

          const roleTasksPrimary = [...(primaryNonCompleted || []), ...(primaryCompletedRecurring || [])];

          // 2) Tasks via task_locations join
          let roleTasksViaLocations: any[] = [];
          if (locationTaskIds.length > 0) {
            // Query A: Non-completed via task_locations
            const { data: locNonCompleted, error: locNonCompletedErr } = await supabase
              .from("tasks")
              .select(baseRoleTaskSelect)
              .eq("company_id", companyId)
              .eq("assigned_role_id", matchingRole.id)
              .in("id", locationTaskIds)
              .is("assigned_to", null)
              .neq("status", "completed")
              .order("due_at", { ascending: true, nullsFirst: false });

            // Query B: Completed recurring via task_locations
            const { data: locCompletedRecurring, error: locCompletedRecurringErr } = await supabase
              .from("tasks")
              .select(baseRoleTaskSelect)
              .eq("company_id", companyId)
              .eq("assigned_role_id", matchingRole.id)
              .in("id", locationTaskIds)
              .is("assigned_to", null)
              .eq("status", "completed")
              .not("recurrence_type", "is", null)
              .neq("recurrence_type", "none")
              .order("due_at", { ascending: true, nullsFirst: false });

            if ((locNonCompletedErr || locCompletedRecurringErr) && import.meta.env.DEV) {
              console.error("[useMyTasks] task_locations fetch errors:", { locNonCompletedErr, locCompletedRecurringErr });
            }

            roleTasksViaLocations = [...(locNonCompleted || []), ...(locCompletedRecurring || [])];
          }

          // 3) Global role tasks (no location)
          // Query A: Non-completed global
          const { data: globalNonCompleted, error: globalNonCompletedErr } = await supabase
            .from("tasks")
            .select(baseRoleTaskSelect)
            .eq("company_id", companyId)
            .eq("assigned_role_id", matchingRole.id)
            .is("location_id", null)
            .is("assigned_to", null)
            .neq("status", "completed")
            .order("due_at", { ascending: true, nullsFirst: false });

          // Query B: Completed recurring global
          const { data: globalCompletedRecurring, error: globalCompletedRecurringErr } = await supabase
            .from("tasks")
            .select(baseRoleTaskSelect)
            .eq("company_id", companyId)
            .eq("assigned_role_id", matchingRole.id)
            .is("location_id", null)
            .is("assigned_to", null)
            .eq("status", "completed")
            .not("recurrence_type", "is", null)
            .neq("recurrence_type", "none")
            .order("due_at", { ascending: true, nullsFirst: false });

          if ((globalNonCompletedErr || globalCompletedRecurringErr) && import.meta.env.DEV) {
            console.error("[useMyTasks] Global fetch errors:", { globalNonCompletedErr, globalCompletedRecurringErr });
          }

          const roleTasksGlobal = [...(globalNonCompleted || []), ...(globalCompletedRecurring || [])];

          // Merge all role tasks and deduplicate
          const mergedRoleTasks = [
            ...roleTasksPrimary,
            ...roleTasksViaLocations,
            ...roleTasksGlobal,
          ];

          roleTasks = mergedRoleTasks.filter(
            (task, index, self) => index === self.findIndex((t) => t.id === task.id)
          );

          // DEBUG: Log role task counts with recurring template breakdown
          const recurringTemplates = roleTasks.filter(
            (t) => t.recurrence_type && t.recurrence_type !== "none"
          );
          const completedRecurring = recurringTemplates.filter(
            (t) => t.status === "completed"
          );
          
          if (import.meta.env.DEV) {
            console.log("[useMyTasks] Role task fetch summary:", {
              primary: roleTasksPrimary?.length || 0,
              viaTaskLocations: roleTasksViaLocations.length,
              global: roleTasksGlobal?.length || 0,
              merged: roleTasks.length,
              recurringTemplates: recurringTemplates.length,
              completedRecurringIncluded: completedRecurring.length,
            });
          }
        }
      } else if (import.meta.env.DEV) {
        console.log("[useMyTasks] Skipping role tasks:", {
          hasShiftToday,
          role: employee.role,
        });
      }

      // Combine and deduplicate tasks
      const allTasks = [...(directTasks || []), ...(completedByMeTasks || []), ...roleTasks];
      const uniqueTasks = allTasks.filter((task, index, self) => 
        index === self.findIndex(t => t.id === task.id)
      );
      
      console.log("[useMyTasks] Final task counts:", { 
        directTasks: directTasks?.length || 0, 
        completedByMe: completedByMeTasks?.length || 0,
        roleTasks: roleTasks.length,
        uniqueTotal: uniqueTasks.length 
      });
      
      // DEV: Log sample tasks to verify role name resolution
      if (import.meta.env.DEV && uniqueTasks.length > 0) {
        console.log("[useMyTasks] Sample tasks (role resolution check):", 
          uniqueTasks.slice(0, 3).map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            assigned_role_id: t.assigned_role_id,
            assigned_role_name: t.assigned_role?.name,
            execution_mode: t.execution_mode,
          }))
        );
      }

      // Add employee info
      const { data: emp } = await supabase
        .from("employees")
        .select("id, full_name, avatar_url")
        .eq("id", employee.id)
        .single();

      return uniqueTasks.map((task) => ({
        ...task,
        assigned_employee: task.assigned_to ? emp : null,
      })) as Task[];
    },
    enabled: !!user?.id,
  });
};

export const useTaskStats = () => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["task-stats", company?.id],
    queryFn: async () => {
      if (!company?.id) return { total: 0, pending: 0, overdue: 0, completed: 0, completedLate: 0 };

      const { data, error } = await supabase
        .from("tasks")
        .select("status, due_at, start_at, duration_minutes, completed_late")
        .eq("company_id", company.id);

      if (error) throw error;

      const now = new Date();
      const stats = {
        total: data.length,
        pending: 0,
        overdue: 0,
        completed: 0,
        completedLate: 0,
      };

      data.forEach((task) => {
        if (task.status === "completed") {
          stats.completed++;
          if (task.completed_late) {
            stats.completedLate++;
          }
        } else if (task.status === "pending" || task.status === "in_progress") {
          // Check if overdue based on start_at + duration_minutes OR due_at
          let isOverdue = false;
          if (task.start_at && task.duration_minutes) {
            const deadline = new Date(new Date(task.start_at).getTime() + task.duration_minutes * 60000);
            isOverdue = now > deadline;
          } else if (task.due_at) {
            isOverdue = new Date(task.due_at) < now;
          }
          
          if (isOverdue) {
            stats.overdue++;
          } else {
            stats.pending++;
          }
        }
      });

      return stats;
    },
    enabled: !!company?.id,
  });
};

interface CreateTaskData {
  title: string;
  description?: string;
  priority: string;
  status?: string;
  due_at?: string;
  start_at?: string;
  duration_minutes?: number;
  assigned_to?: string;
  assigned_role_id?: string;
  assigned_role_ids?: string[];
  location_ids?: string[];
  source?: string;
  source_reference_id?: string;
  recurrence_type?: string;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_days_of_week?: number[];
  recurrence_days_of_month?: number[];
  is_individual?: boolean;
}

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      if (!company?.id || !user?.id) throw new Error("Not authenticated");

      const { location_ids, assigned_role_ids, ...taskData } = data;

      // Create the task (use first location as primary for backward compatibility)
      // Use first role as primary for backward compatibility
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          ...taskData,
          company_id: company.id,
          created_by: user.id,
          location_id: location_ids?.[0] || null,
          assigned_role_id: assigned_role_ids?.[0] || taskData.assigned_role_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert into task_locations junction table for all locations
      if (location_ids && location_ids.length > 0) {
        const taskLocations = location_ids.map(locationId => ({
          task_id: task.id,
          location_id: locationId,
        }));

        const { error: locError } = await supabase
          .from("task_locations")
          .insert(taskLocations);

        if (locError) {
          console.error("Error creating task locations:", locError);
        }
      }

      // Insert into task_roles junction table for all roles
      if (assigned_role_ids && assigned_role_ids.length > 0) {
        const taskRoles = assigned_role_ids.map(roleId => ({
          task_id: task.id,
          role_id: roleId,
        }));

        const { error: roleError } = await supabase
          .from("task_roles")
          .insert(taskRoles);

        if (roleError) {
          console.error("Error creating task roles:", roleError);
        }
      }

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === "tasks" || key[0] === "task-stats" || key[0] === "my-tasks";
        }
      });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Task> & { id: string }) => {
      const { data: task, error } = await supabase
        .from("tasks")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === "tasks" || key[0] === "task-stats" || key[0] === "my-tasks";
        }
      });
    },
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (taskId: string) => {
      // Resolve virtual IDs (e.g., "uuid-virtual-2024-01-21") to real task IDs
      const resolvedId = resolveTaskId(taskId);
      
      // First, get the full task to check recurrence and other fields
      const { data: existingTask } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", resolvedId)
        .single();

      if (!existingTask) throw new Error("Task not found");

      // Get the employee record for the current user to set completed_by
      let employeeId: string | null = null;
      if (user?.id) {
        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .single();
        employeeId = employee?.id || null;
      }

      const now = new Date();
      let completedLate = false;

      if (existingTask?.start_at && existingTask?.duration_minutes) {
        const startTime = new Date(existingTask.start_at);
        const deadline = new Date(startTime.getTime() + existingTask.duration_minutes * 60000);
        completedLate = now > deadline;
      }

      const { data: task, error } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: now.toISOString(),
          completed_late: completedLate,
          completed_by: employeeId,
        })
        .eq("id", resolvedId)
        .select()
        .single();

      if (error) throw error;

      // If this is a recurring task, create the next instance
      if (existingTask.recurrence_type && existingTask.recurrence_type !== "none") {
        const nextStartAt = calculateNextOccurrence(
          existingTask.start_at || existingTask.due_at,
          existingTask.recurrence_type,
          existingTask.recurrence_interval || 1,
          existingTask.recurrence_days_of_week,
          existingTask.recurrence_days_of_month
        );

        // Check if we should still create the next occurrence
        const shouldCreate = !existingTask.recurrence_end_date || 
          new Date(nextStartAt) <= new Date(existingTask.recurrence_end_date);

        if (shouldCreate && nextStartAt) {
          // Create the next recurring task instance
          const { data: newTask, error: createError } = await supabase
            .from("tasks")
            .insert({
              company_id: existingTask.company_id,
              title: existingTask.title,
              description: existingTask.description,
              priority: existingTask.priority,
              status: "pending",
              location_id: existingTask.location_id,
              assigned_to: existingTask.assigned_to,
              assigned_role_id: existingTask.assigned_role_id,
              is_individual: existingTask.is_individual,
              start_at: existingTask.start_at ? nextStartAt : null,
              due_at: existingTask.start_at ? null : nextStartAt,
              duration_minutes: existingTask.duration_minutes,
              created_by: existingTask.created_by,
              source: existingTask.source,
              source_reference_id: existingTask.source_reference_id,
              recurrence_type: existingTask.recurrence_type,
              recurrence_interval: existingTask.recurrence_interval,
              recurrence_end_date: existingTask.recurrence_end_date,
              recurrence_days_of_week: existingTask.recurrence_days_of_week,
              recurrence_days_of_month: existingTask.recurrence_days_of_month,
              parent_task_id: existingTask.parent_task_id || existingTask.id,
              is_recurring_instance: true,
            })
            .select()
            .single();

          if (!createError && newTask) {
            // Copy task_locations
            const { data: taskLocations } = await supabase
              .from("task_locations")
              .select("location_id")
              .eq("task_id", resolvedId);

            if (taskLocations && taskLocations.length > 0) {
              await supabase
                .from("task_locations")
                .insert(taskLocations.map(tl => ({
                  task_id: newTask.id,
                  location_id: tl.location_id,
                })));
            }

            // Copy task_roles
            const { data: taskRoles } = await supabase
              .from("task_roles")
              .select("role_id")
              .eq("task_id", resolvedId);

            if (taskRoles && taskRoles.length > 0) {
              await supabase
                .from("task_roles")
                .insert(taskRoles.map(tr => ({
                  task_id: newTask.id,
                  role_id: tr.role_id,
                })));
            }
          }
        }
      }

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === "tasks" || key[0] === "task-stats" || key[0] === "my-tasks";
        }
      });
    },
  });
};

// Helper function to calculate the next occurrence date
function calculateNextOccurrence(
  currentDate: string | null,
  recurrenceType: string,
  interval: number,
  daysOfWeek: number[] | null,
  daysOfMonth: number[] | null
): string | null {
  if (!currentDate) return null;

  const date = new Date(currentDate);
  
  switch (recurrenceType) {
    case "daily":
      date.setDate(date.getDate() + interval);
      break;
    case "weekly":
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next day of week
        const currentDay = date.getDay();
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
        const nextDay = sortedDays.find(d => d > currentDay);
        
        if (nextDay !== undefined) {
          date.setDate(date.getDate() + (nextDay - currentDay));
        } else {
          // Wrap to next week
          date.setDate(date.getDate() + (7 - currentDay + sortedDays[0]));
        }
      } else {
        date.setDate(date.getDate() + 7 * interval);
      }
      break;
    case "monthly":
      if (daysOfMonth && daysOfMonth.length > 0) {
        const currentDayOfMonth = date.getDate();
        const sortedDays = [...daysOfMonth].sort((a, b) => a - b);
        const nextDay = sortedDays.find(d => d > currentDayOfMonth);
        
        if (nextDay !== undefined) {
          date.setDate(nextDay);
        } else {
          // Move to next month
          date.setMonth(date.getMonth() + 1);
          date.setDate(sortedDays[0]);
        }
      } else {
        date.setMonth(date.getMonth() + interval);
      }
      break;
    default:
      return null;
  }

  return date.toISOString();
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Use predicate to match all task-related queries regardless of filters
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === "tasks" || key[0] === "task-stats" || key[0] === "my-tasks";
        }
      });
    },
  });
};
