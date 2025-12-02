import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { toast } from "sonner";

export interface ShiftPreset {
  id: string;
  company_id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useShiftPresets = () => {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ["shift-presets", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("shift_presets")
        .select("*")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as ShiftPreset[];
    },
    enabled: !!company?.id,
  });
};

export const useCreateShiftPreset = () => {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (preset: Omit<ShiftPreset, "id" | "company_id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!company?.id) throw new Error("No company found");

      const { data, error } = await supabase
        .from("shift_presets")
        .insert({
          ...preset,
          company_id: company.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-presets"] });
      toast.success("Shift preset created");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create shift preset");
    },
  });
};

export const useUpdateShiftPreset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ShiftPreset> & { id: string }) => {
      const { data, error } = await supabase
        .from("shift_presets")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-presets"] });
      toast.success("Shift preset updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update shift preset");
    },
  });
};

export const useDeleteShiftPreset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("shift_presets")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-presets"] });
      toast.success("Shift preset deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete shift preset");
    },
  });
};
