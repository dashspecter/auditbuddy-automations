import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EquipmentStatusHistory {
  id: string;
  equipment_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  changed_at: string;
  notes: string | null;
  created_at: string;
}

export const useEquipmentStatusHistory = (equipmentId: string) => {
  return useQuery({
    queryKey: ["equipment-status-history", equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_status_history")
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!equipmentId,
  });
};
