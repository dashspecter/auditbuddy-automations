import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TrainingProgram {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_hours: number | null;
  is_mandatory: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingStep {
  id: string;
  program_id: string;
  step_order: number;
  title: string;
  description: string | null;
  step_type: string; // 'document', 'task', 'audit', 'quiz'
  reference_id: string | null;
  is_required: boolean;
  created_at: string;
}

export const useTrainingPrograms = () => {
  return useQuery({
    queryKey: ["training_programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_programs")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as unknown as TrainingProgram[];
    },
  });
};

export const useTrainingProgram = (id: string | undefined) => {
  return useQuery({
    queryKey: ["training_program", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("training_programs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as TrainingProgram;
    },
    enabled: !!id,
  });
};

export const useTrainingSteps = (programId: string | undefined) => {
  return useQuery({
    queryKey: ["training_steps", programId],
    queryFn: async () => {
      if (!programId) return [];

      const { data, error } = await supabase
        .from("training_steps")
        .select("*")
        .eq("program_id", programId)
        .order("step_order");

      if (error) throw error;
      return data as TrainingStep[];
    },
    enabled: !!programId,
  });
};

export const useCreateTrainingProgram = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (program: Omit<TrainingProgram, "id" | "created_at" | "updated_at" | "created_by" | "company_id">) => {
      if (!user) throw new Error("Not authenticated");

      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!companyUser) throw new Error("No company found");

      const { data, error } = await supabase
        .from("training_programs")
        .insert({
          ...program,
          company_id: companyUser.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_programs"] });
      toast.success("Training program created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create training program: ${error.message}`);
    },
  });
};

export const useCreateTrainingStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (step: Omit<TrainingStep, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("training_steps")
        .insert(step)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training_steps", data.program_id] });
      toast.success("Training step added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add training step: ${error.message}`);
    },
  });
};