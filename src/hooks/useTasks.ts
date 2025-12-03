import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";

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
  parent_task_id: string | null;
  is_recurring_instance: boolean | null;
  // Joined data
  assigned_employee?: {
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

      // Fetch assigned employees separately
      const tasksWithAssignees = await Promise.all(
        (tasks || []).map(async (task) => {
          let assigned_employee = null;
          if (task.assigned_to) {
            const { data: emp } = await supabase
              .from("employees")
              .select("id, full_name, avatar_url")
              .eq("id", task.assigned_to)
              .single();
            assigned_employee = emp;
          }
          return { ...task, assigned_employee } as Task;
        })
      );

      return tasksWithAssignees;
    },
    enabled: !!company?.id,
  });
};

export const useMyTasks = () => {
  const { user } = useAuth();
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["my-tasks", company?.id, user?.id],
    queryFn: async () => {
      if (!company?.id || !user?.id) return [];

      // First get the employee record for the current user
      const { data: employee } = await supabase
        .from("employees")
        .select("id, role, location_id")
        .eq("user_id", user.id)
        .single();

      if (!employee) return [];

      // Get today's date for shift checking
      const today = new Date().toISOString().split('T')[0];

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

      const hasShiftToday = (todayShifts && todayShifts.length > 0);
      const shiftLocationIds = todayShifts?.map((s: any) => s.shifts?.location_id).filter(Boolean) || [];

      // Fetch tasks directly assigned to this employee (exclude completed)
      const { data: directTasks, error: directError } = await supabase
        .from("tasks")
        .select(`
          *,
          location:locations(id, name),
          assigned_role:employee_roles(id, name)
        `)
        .eq("company_id", company.id)
        .eq("assigned_to", employee.id)
        .neq("status", "completed")
        .order("due_at", { ascending: true, nullsFirst: false });

      if (directError) throw directError;

      // Fetch tasks assigned to employee's role (only if has shift today)
      let roleTasks: any[] = [];
      if (hasShiftToday && employee.role) {
        // Get the role ID that matches employee's role name
        const { data: matchingRole } = await supabase
          .from("employee_roles")
          .select("id")
          .eq("company_id", company.id)
          .eq("name", employee.role)
          .single();

        if (matchingRole) {
          // Fetch tasks assigned to this role at locations where employee has shift today (exclude completed)
          const { data: roleTasksData, error: roleError } = await supabase
            .from("tasks")
            .select(`
              *,
              location:locations(id, name),
              assigned_role:employee_roles(id, name)
            `)
            .eq("company_id", company.id)
            .eq("assigned_role_id", matchingRole.id)
            .in("location_id", shiftLocationIds)
            .is("assigned_to", null) // Only role-assigned, not individually assigned
            .neq("status", "completed") // Exclude completed - shared tasks disappear when done
            .order("due_at", { ascending: true, nullsFirst: false });

          if (!roleError && roleTasksData) {
            roleTasks = roleTasksData;
          }
        }
      }

      // Combine and deduplicate tasks
      const allTasks = [...(directTasks || []), ...roleTasks];
      const uniqueTasks = allTasks.filter((task, index, self) => 
        index === self.findIndex(t => t.id === task.id)
      );

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
    enabled: !!company?.id && !!user?.id,
  });
};

export const useTaskStats = () => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["task-stats", company?.id],
    queryFn: async () => {
      if (!company?.id) return { total: 0, pending: 0, overdue: 0, completed: 0 };

      const { data, error } = await supabase
        .from("tasks")
        .select("status, due_at")
        .eq("company_id", company.id);

      if (error) throw error;

      const now = new Date();
      const stats = {
        total: data.length,
        pending: 0,
        overdue: 0,
        completed: 0,
      };

      data.forEach((task) => {
        if (task.status === "completed") {
          stats.completed++;
        } else if (task.status === "pending" || task.status === "in_progress") {
          if (task.due_at && new Date(task.due_at) < now) {
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
  location_id?: string;
  source?: string;
  source_reference_id?: string;
  recurrence_type?: string;
  recurrence_interval?: number;
  recurrence_end_date?: string;
}

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      if (!company?.id || !user?.id) throw new Error("Not authenticated");

      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          ...data,
          company_id: company.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      // First, get the task to check if it should be marked as late
      const { data: existingTask } = await supabase
        .from("tasks")
        .select("start_at, duration_minutes")
        .eq("id", taskId)
        .single();

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
        })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });
};
