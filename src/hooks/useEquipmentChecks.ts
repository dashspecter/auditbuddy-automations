import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EquipmentCheck {
  id: string;
  equipment_id: string;
  check_date: string;
  performed_by: string;
  notes: string | null;
  result_status: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export const useEquipmentChecks = (equipmentId?: string) => {
  return useQuery({
    queryKey: ["equipment-checks", equipmentId],
    queryFn: async () => {
      if (!equipmentId) return [];
      
      const { data, error } = await supabase
        .from("equipment_checks")
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("check_date", { ascending: false });
      
      if (error) throw error;
      return data as EquipmentCheck[];
    },
    enabled: !!equipmentId,
  });
};

export const useCreateEquipmentCheck = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (check: Omit<EquipmentCheck, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("equipment_checks")
        .insert(check)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["equipment-checks", variables.equipment_id] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipment check logged successfully");
    },
    onError: (error) => {
      toast.error("Failed to log check: " + error.message);
    },
  });
};
