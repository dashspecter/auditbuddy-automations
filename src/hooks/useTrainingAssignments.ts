import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TrainingAssignment, TrainingSession, TrainingEvaluation } from "./useTrainingModules";

// Assignments
export const useTrainingAssignments = (filters?: {
  status?: string;
  traineeId?: string;
  trainerId?: string;
  moduleId?: string;
}) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["training_assignments", company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("training_assignments")
        .select(`
          *,
          trainee:employees!training_assignments_trainee_employee_id_fkey(id, full_name, role),
          trainer:employees!training_assignments_trainer_employee_id_fkey(id, full_name),
          module:training_programs!training_assignments_module_id_fkey(id, name, duration_days, difficulty_level),
          location:locations(id, name)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.traineeId) {
        query = query.eq("trainee_employee_id", filters.traineeId);
      }
      if (filters?.trainerId) {
        query = query.eq("trainer_employee_id", filters.trainerId);
      }
      if (filters?.moduleId) {
        query = query.eq("module_id", filters.moduleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TrainingAssignment[];
    },
    enabled: !!company?.id,
  });
};

export const useTrainingAssignment = (id: string | undefined) => {
  return useQuery({
    queryKey: ["training_assignment", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("training_assignments")
        .select(`
          *,
          trainee:employees!training_assignments_trainee_employee_id_fkey(id, full_name, role),
          trainer:employees!training_assignments_trainer_employee_id_fkey(id, full_name),
          module:training_programs!training_assignments_module_id_fkey(*),
          location:locations(id, name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as TrainingAssignment;
    },
    enabled: !!id,
  });
};

export const useCreateTrainingAssignment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (assignment: Partial<TrainingAssignment>) => {
      if (!user || !company?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("training_assignments")
        .insert({
          company_id: company.id,
          trainee_employee_id: assignment.trainee_employee_id!,
          module_id: assignment.module_id!,
          trainer_employee_id: assignment.trainer_employee_id,
          location_id: assignment.location_id,
          start_date: assignment.start_date!,
          status: assignment.status ?? 'planned',
          experience_level: assignment.experience_level,
          notes: assignment.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_assignments"] });
      toast.success("Training assignment created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create assignment: ${error.message}`);
    },
  });
};

export const useUpdateTrainingAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingAssignment> & { id: string }) => {
      const { data, error } = await supabase
        .from("training_assignments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["training_assignment", data.id] });
      toast.success("Assignment updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });
};

// Sessions
export const useTrainingSessions = (filters?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  assignmentId?: string;
}) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["training_sessions", company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("training_sessions")
        .select(`
          *,
          trainer:employees!training_sessions_trainer_employee_id_fkey(id, full_name),
          location:locations(id, name),
          module:training_programs(id, name),
          attendees:training_session_attendees(
            id,
            employee_id,
            attendee_role,
            employee:employees(id, full_name)
          )
        `)
        .eq("company_id", company.id)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (filters?.date) {
        query = query.eq("session_date", filters.date);
      }
      if (filters?.startDate) {
        query = query.gte("session_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("session_date", filters.endDate);
      }
      if (filters?.assignmentId) {
        query = query.eq("assignment_id", filters.assignmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TrainingSession[];
    },
    enabled: !!company?.id,
  });
};

export const useCreateTrainingSession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (session: Partial<TrainingSession> & { traineeIds?: string[] }) => {
      if (!user || !company?.id) throw new Error("Not authenticated");

      // Create session
      const { data: sessionData, error: sessionError } = await supabase
        .from("training_sessions")
        .insert({
          company_id: company.id,
          assignment_id: session.assignment_id,
          module_id: session.module_id,
          location_id: session.location_id!,
          session_date: session.session_date!,
          start_time: session.start_time!,
          end_time: session.end_time!,
          trainer_employee_id: session.trainer_employee_id,
          title: session.title,
          notes: session.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add trainer as attendee
      if (session.trainer_employee_id) {
        await supabase
          .from("training_session_attendees")
          .insert({
            session_id: sessionData.id,
            employee_id: session.trainer_employee_id,
            attendee_role: 'trainer',
          });
      }

      // Add trainees as attendees
      if (session.traineeIds?.length) {
        await supabase
          .from("training_session_attendees")
          .insert(
            session.traineeIds.map(tid => ({
              session_id: sessionData.id,
              employee_id: tid,
              attendee_role: 'trainee',
            }))
          );
      }

      // Create corresponding training shift
      const { error: shiftError } = await supabase
        .from("shifts")
        .insert({
          company_id: company.id,
          location_id: session.location_id!,
          shift_date: session.session_date!,
          start_time: session.start_time!,
          end_time: session.end_time!,
          role: 'Training',
          shift_type: 'training',
          training_session_id: sessionData.id,
          training_module_id: session.module_id,
          trainer_employee_id: session.trainer_employee_id,
          cohort_label: session.title,
          created_by: user.id,
          status: 'published',
          is_published: true,
          required_count: (session.traineeIds?.length || 0) + 1,
        });

      if (shiftError) {
        console.error("Failed to create training shift:", shiftError);
      }

      return sessionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Training session created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create session: ${error.message}`);
    },
  });
};

// Evaluations
export const useTrainingEvaluations = (assignmentId?: string) => {
  return useQuery({
    queryKey: ["training_evaluations", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];

      const { data, error } = await supabase
        .from("training_evaluations")
        .select(`
          *,
          trainee:employees!training_evaluations_trainee_employee_id_fkey(id, full_name),
          trainer:employees!training_evaluations_trainer_employee_id_fkey(id, full_name)
        `)
        .eq("assignment_id", assignmentId)
        .order("evaluation_date", { ascending: false });

      if (error) throw error;
      return data as unknown as TrainingEvaluation[];
    },
    enabled: !!assignmentId,
  });
};

export const useCreateTrainingEvaluation = () => {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (evaluation: Partial<TrainingEvaluation>) => {
      if (!company?.id) throw new Error("No company context");

      const { data, error } = await supabase
        .from("training_evaluations")
        .insert({
          company_id: company.id,
          assignment_id: evaluation.assignment_id!,
          session_id: evaluation.session_id,
          module_day_id: evaluation.module_day_id,
          trainee_employee_id: evaluation.trainee_employee_id!,
          trainer_employee_id: evaluation.trainer_employee_id!,
          evaluation_date: evaluation.evaluation_date!,
          score: evaluation.score,
          passed: evaluation.passed,
          notes: evaluation.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_evaluations"] });
      toast.success("Evaluation saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save evaluation: ${error.message}`);
    },
  });
};

// Generate tasks for assignment
export const useGenerateTrainingTasks = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      // Fetch assignment details
      const { data: assignment, error: assignmentError } = await supabase
        .from("training_assignments")
        .select(`
          *,
          module:training_programs(
            id,
            name,
            duration_days
          )
        `)
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Fetch module days with tasks
      const { data: days, error: daysError } = await supabase
        .from("training_module_days")
        .select(`
          *,
          tasks:training_module_day_tasks(*)
        `)
        .eq("module_id", assignment.module_id)
        .order("day_number");

      if (daysError) throw daysError;

      const startDate = new Date(assignment.start_date);
      const generatedTasks: any[] = [];

      // Generate tasks for each day
      for (const day of days as any[]) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + day.day_number - 1);
        const dateStr = scheduledDate.toISOString().split('T')[0];

        for (const templateTask of day.tasks || []) {
          // Check if already generated
          const { data: existing } = await supabase
            .from("training_generated_tasks")
            .select("id")
            .eq("assignment_id", assignmentId)
            .eq("template_task_id", templateTask.id)
            .eq("scheduled_date", dateStr)
            .maybeSingle();

          if (existing) continue;

          // Create task in tasks table
          const { data: task, error: taskError } = await supabase
            .from("tasks")
            .insert({
              company_id: assignment.company_id,
              title: templateTask.task_title,
              description: templateTask.task_description,
              status: 'pending',
              priority: 'medium',
              execution_mode: 'assigned',
              assigned_to: assignment.trainee_employee_id,
              location_id: assignment.location_id,
              start_at: `${dateStr}T09:00:00`,
              due_at: `${dateStr}T17:00:00`,
              created_by: user?.id,
            })
            .select()
            .single();

          if (taskError) {
            console.error("Failed to create task:", taskError);
            continue;
          }

          // Link to training
          await supabase
            .from("training_generated_tasks")
            .insert({
              assignment_id: assignmentId,
              module_day_id: day.id,
              template_task_id: templateTask.id,
              task_id: task.id,
              scheduled_date: dateStr,
            });

          generatedTasks.push(task);
        }
      }

      return generatedTasks;
    },
    onSuccess: (tasks) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["training_generated_tasks"] });
      toast.success(`Generated ${tasks.length} training tasks`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate tasks: ${error.message}`);
    },
  });
};
