import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Types
export interface TrainingModule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  target_role_id: string | null;
  difficulty_level: number;
  duration_days: number;
  category: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  target_role?: { id: string; name: string } | null;
}

export interface TrainingModuleDay {
  id: string;
  module_id: string;
  day_number: number;
  title: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tasks?: TrainingModuleDayTask[];
}

export interface TrainingModuleDayTask {
  id: string;
  module_day_id: string;
  task_title: string;
  task_description: string | null;
  requires_proof: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingAssignment {
  id: string;
  company_id: string;
  trainee_employee_id: string;
  module_id: string;
  trainer_employee_id: string | null;
  location_id: string | null;
  start_date: string;
  status: 'planned' | 'active' | 'completed' | 'paused' | 'cancelled';
  experience_level: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  trainee?: { id: string; full_name: string; role: string | null };
  trainer?: { id: string; full_name: string } | null;
  module?: TrainingModule;
  location?: { id: string; name: string } | null;
}

export interface TrainingSession {
  id: string;
  company_id: string;
  assignment_id: string | null;
  module_id: string | null;
  location_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  trainer_employee_id: string | null;
  title: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  trainer?: { id: string; full_name: string } | null;
  location?: { id: string; name: string };
  module?: { id: string; name: string } | null;
  attendees?: TrainingSessionAttendee[];
}

export interface TrainingSessionAttendee {
  id: string;
  session_id: string;
  employee_id: string;
  attendee_role: 'trainee' | 'trainer' | 'assistant_trainer';
  employee?: { id: string; full_name: string };
}

export interface TrainingEvaluation {
  id: string;
  company_id: string;
  assignment_id: string;
  session_id: string | null;
  module_day_id: string | null;
  trainee_employee_id: string;
  trainer_employee_id: string;
  evaluation_date: string;
  score: number | null;
  passed: boolean | null;
  notes: string | null;
  audit_instance_id: string | null;
  created_at: string;
  trainee?: { id: string; full_name: string };
  trainer?: { id: string; full_name: string };
  audit_instance?: {
    id: string;
    status: string;
    overall_score: number | null;
    template?: { id: string; name: string };
  } | null;
}

export interface TrainingModuleEvaluation {
  id: string;
  module_id: string;
  module_day_id: string | null;
  audit_template_id: string;
  is_required: boolean;
  created_at: string;
  audit_template?: {
    id: string;
    name: string;
    description: string | null;
  };
  module_day?: {
    id: string;
    day_number: number;
    title: string;
  } | null;
}

// Hooks
export const useTrainingModules = () => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["training_modules", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("training_programs")
        .select(`
          *,
          target_role:employee_roles(id, name)
        `)
        .eq("company_id", company.id)
        .order("name");

      if (error) throw error;
      return data as unknown as TrainingModule[];
    },
    enabled: !!company?.id,
  });
};

export const useTrainingModule = (id: string | undefined) => {
  return useQuery({
    queryKey: ["training_module", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("training_programs")
        .select(`
          *,
          target_role:employee_roles(id, name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as TrainingModule;
    },
    enabled: !!id,
  });
};

export const useTrainingModuleDays = (moduleId: string | undefined) => {
  return useQuery({
    queryKey: ["training_module_days", moduleId],
    queryFn: async () => {
      if (!moduleId) return [];

      const { data, error } = await supabase
        .from("training_module_days")
        .select(`
          *,
          tasks:training_module_day_tasks(*)
        `)
        .eq("module_id", moduleId)
        .order("day_number");

      if (error) throw error;
      return data as unknown as TrainingModuleDay[];
    },
    enabled: !!moduleId,
  });
};

export const useCreateTrainingModule = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (module: Partial<TrainingModule>) => {
      if (!user || !company?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("training_programs")
        .insert({
          name: module.name!,
          description: module.description,
          company_id: company.id,
          created_by: user.id,
          is_active: module.is_active ?? true,
          target_role_id: module.target_role_id,
          difficulty_level: module.difficulty_level ?? 1,
          duration_days: module.duration_days ?? 1,
          category: module.category,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_modules"] });
      toast.success("Training module created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create module: ${error.message}`);
    },
  });
};

export const useUpdateTrainingModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingModule> & { id: string }) => {
      const { data, error } = await supabase
        .from("training_programs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training_modules"] });
      queryClient.invalidateQueries({ queryKey: ["training_module", data.id] });
      toast.success("Training module updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update module: ${error.message}`);
    },
  });
};

export const useCreateModuleDay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: Omit<TrainingModuleDay, 'id' | 'created_at' | 'updated_at' | 'tasks'>) => {
      const { data, error } = await supabase
        .from("training_module_days")
        .insert(day)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training_module_days", data.module_id] });
      toast.success("Day added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add day: ${error.message}`);
    },
  });
};

export const useUpdateModuleDay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingModuleDay> & { id: string }) => {
      const { data, error } = await supabase
        .from("training_module_days")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training_module_days", data.module_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update day: ${error.message}`);
    },
  });
};

export const useDeleteModuleDay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, moduleId }: { id: string; moduleId: string }) => {
      const { error } = await supabase
        .from("training_module_days")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, moduleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training_module_days", data.moduleId] });
      toast.success("Day removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove day: ${error.message}`);
    },
  });
};

export const useCreateDayTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Omit<TrainingModuleDayTask, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("training_module_day_tasks")
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_module_days"] });
      toast.success("Task added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add task: ${error.message}`);
    },
  });
};

export const useDeleteDayTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("training_module_day_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_module_days"] });
      toast.success("Task removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove task: ${error.message}`);
    },
  });
};

// Hooks for training module evaluations (audit templates linked to modules)
// NOTE: training_module_evaluations does NOT have day_number column - must join module_day for ordering
// Using explicit FK name for robust join resolution
export const useTrainingModuleEvaluations = (moduleId: string | undefined) => {
  return useQuery({
    queryKey: ["training_module_evaluations", moduleId],
    queryFn: async () => {
      if (!moduleId) return [];

      const { data, error } = await supabase
        .from("training_module_evaluations")
        .select(`
          *,
          audit_template:audit_templates!training_module_evaluations_audit_template_id_fkey(id, name, description),
          module_day:training_module_days!training_module_evaluations_module_day_id_fkey(id, day_number, title)
        `)
        .eq("module_id", moduleId);

      if (error) throw error;
      
      // Sort by module_day.day_number (with nulls last for general evaluations)
      const sorted = (data || []).sort((a: any, b: any) => {
        const dayA = a.module_day?.day_number ?? 999;
        const dayB = b.module_day?.day_number ?? 999;
        return dayA - dayB;
      });
      
      return sorted as unknown as TrainingModuleEvaluation[];
    },
    enabled: !!moduleId,
  });
};

export const useAddModuleEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evaluation: {
      module_id: string;
      module_day_id?: string;
      audit_template_id: string;
      is_required?: boolean;
      day_number?: number;
    }) => {
      const { data, error } = await supabase
        .from("training_module_evaluations")
        .insert({
          module_id: evaluation.module_id,
          module_day_id: evaluation.module_day_id || null,
          audit_template_id: evaluation.audit_template_id,
          is_required: evaluation.is_required ?? true,
          day_number: evaluation.day_number || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training_module_evaluations", data.module_id] });
      toast.success("Evaluation template linked");
    },
    onError: (error: Error) => {
      toast.error(`Failed to link evaluation: ${error.message}`);
    },
  });
};

export const useRemoveModuleEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, moduleId }: { id: string; moduleId: string }) => {
      const { error } = await supabase
        .from("training_module_evaluations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, moduleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training_module_evaluations", data.moduleId] });
      toast.success("Evaluation template removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove evaluation: ${error.message}`);
    },
  });
};
