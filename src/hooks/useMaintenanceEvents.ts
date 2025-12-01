import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MaintenanceEvent {
  id: string;
  equipment_id: string;
  event_date: string;
  technician: string;
  description: string;
  cost: number | null;
  parts_used: any;
  attachments: any;
  created_at: string;
  equipment?: {
    name: string;
  };
}

export const useMaintenanceEvents = (equipmentId?: string) => {
  return useQuery({
    queryKey: ["maintenance-events", equipmentId],
    queryFn: async () => {
      let query = supabase
        .from("equipment_maintenance_events")
        .select("*, equipment(name)")
        .order("event_date", { ascending: false });
      
      if (equipmentId) {
        query = query.eq("equipment_id", equipmentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MaintenanceEvent[];
    },
  });
};

export const useCreateMaintenanceEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: Omit<MaintenanceEvent, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("equipment_maintenance_events")
        .insert(event)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-events", variables.equipment_id] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Maintenance event logged successfully");
    },
    onError: (error) => {
      toast.error("Failed to log maintenance: " + error.message);
    },
  });
};
