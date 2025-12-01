import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TrainingProgress {
  id: string;
  program_id: string;
  staff_id: string | null;
  status: string; // 'not_started', 'in_progress', 'completed'
  completion_percentage: number;
  started_at: string | null;
  completed_at: string | null;
  assigned_by: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  training_programs?: {
    name: string;
    description: string | null;
  };
  employees?: {
    full_name: string;
  };
}

export interface TrainingStepCompletion {
  id: string;
  progress_id: string;
  step_id: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export const useTrainingProgress = (filters?: {
  programId?: string;
  staffId?: string;
}) => {
  return useQuery({
    queryKey: ["training_progress", filters],
    queryFn: async () => {
      let query = supabase
        .from("training_progress")
        .select(`
          *,
          training_programs(name, description),
          employees(full_name)
        `)
        .order("assigned_at", { ascending: false });

      if (filters?.programId) {
        query = query.eq("program_id", filters.programId);
      }
      if (filters?.staffId) {
        query = query.eq("staff_id", filters.staffId);
      }

      const { data, error} = await query;
      if (error) throw error;
      return data as unknown as TrainingProgress[];
    },
  });
};

export const useStepCompletions = (progressId: string | undefined) => {
  return useQuery({
    queryKey: ["training_step_completion", progressId],
    queryFn: async () => {
      if (!progressId) return [];

      const { data, error } = await supabase
        .from("training_step_completion" as any)
        .select("*")
        .eq("progress_id", progressId)
        .order("created_at");

      if (error) throw error;
      return data as unknown as TrainingStepCompletion[];
    },
    enabled: !!progressId,
  });
};

export const useAssignTraining = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      programId,
      staffId,
    }: {
      programId: string;
      staffId: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("training_progress")
        .insert({
          program_id: programId,
          staff_id: staffId,
          assigned_by: user.id,
          status: "not_started",
          completion_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_progress"] });
      toast.success("Training assigned successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign training: ${error.message}`);
    },
  });
};

export const useCompleteStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      progressId,
      stepId,
      notes,
    }: {
      progressId: string;
      stepId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("training_step_completion" as any)
        .upsert({
          progress_id: progressId,
          step_id: stepId,
          completed: true,
          completed_at: new Date().toISOString(),
          notes: notes || null,
        }, {
          onConflict: "progress_id,step_id"
        })
        .select()
        .single();

      if (error) throw error;

      // Update overall progress percentage
      const { data: progressData } = await supabase
        .from("training_progress" as any)
        .select("program_id")
        .eq("id", progressId)
        .single();

      const programId = (progressData as any)?.program_id;
      if (!programId) return data;

      const { data: steps } = await supabase
        .from("training_steps" as any)
        .select("id")
        .eq("program_id", programId);

      const { data: completions } = await supabase
        .from("training_step_completion" as any)
        .select("id")
        .eq("progress_id", progressId)
        .eq("completed", true);

      const percentage = steps && completions
        ? Math.round((completions.length / steps.length) * 100)
        : 0;

      await supabase
        .from("training_progress")
        .update({
          completion_percentage: percentage,
          status: percentage === 100 ? "completed" : "in_progress",
          started_at: percentage > 0 ? new Date().toISOString() : null,
          completed_at: percentage === 100 ? new Date().toISOString() : null,
        })
        .eq("id", progressId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_step_completion", variables.progressId] });
      queryClient.invalidateQueries({ queryKey: ["training_progress"] });
      toast.success("Step completed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete step: ${error.message}`);
    },
  });
};