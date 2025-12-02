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
  due_at: string | null;
  completed_at: string | null;
  status: string;
  priority: string;
  source: string;
  source_reference_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_employee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
}

export const useTasks = (filters?: { status?: string; assignedTo?: string; locationId?: string }) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["tasks", company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("tasks")
        .select(`
          *,
          location:locations(id, name)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.assignedTo) {
        query = query.eq("assigned_to", filters.assignedTo);
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
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!employee) return [];

      const { data: tasks, error } = await supabase
        .from("tasks")
        .select(`
          *,
          location:locations(id, name)
        `)
        .eq("company_id", company.id)
        .eq("assigned_to", employee.id)
        .order("due_at", { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Add employee info
      const { data: emp } = await supabase
        .from("employees")
        .select("id, full_name, avatar_url")
        .eq("id", employee.id)
        .single();

      return (tasks || []).map((task) => ({
        ...task,
        assigned_employee: emp,
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
  assigned_to?: string;
  location_id?: string;
  source?: string;
  source_reference_id?: string;
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
      const { data: task, error } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
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
