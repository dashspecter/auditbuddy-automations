import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StaffEvent {
  id: string;
  staff_id: string;
  event_type: string;
  event_date: string;
  amount: number;
  description: string;
  metadata: any;
  created_at: string;
  created_by: string;
}

export const useStaffEvents = (staffId?: string) => {
  return useQuery({
    queryKey: ["staff-events", staffId],
    queryFn: async () => {
      let query = supabase
        .from("staff_events")
        .select("*")
        .order("event_date", { ascending: false });
      
      if (staffId) {
        query = query.eq("staff_id", staffId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StaffEvent[];
    },
    enabled: !!staffId,
  });
};

export const useCreateStaffEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: Omit<StaffEvent, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("staff_events")
        .insert(event)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-events"] });
      toast.success("Event recorded successfully");
    },
    onError: (error) => {
      toast.error("Failed to record event: " + error.message);
    },
  });
};
