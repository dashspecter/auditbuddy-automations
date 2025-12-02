import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ShiftSwapRequest {
  id: string;
  requester_assignment_id: string;
  target_assignment_id: string | null;
  target_staff_id: string | null;
  status: string;
  target_response: string | null;
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  created_at: string;
  company_id: string;
}

export const usePendingSwapRequests = () => {
  return useQuery({
    queryKey: ["pending-swap-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_swap_requests")
        .select(`
          *,
          requester:requester_assignment_id (
            staff_id,
            shift_id,
            employees:staff_id (
              full_name,
              avatar_url
            ),
            shifts:shift_id (
              shift_date,
              start_time,
              end_time,
              role,
              location_id,
              locations:location_id (
                name
              )
            )
          ),
          target:target_assignment_id (
            staff_id,
            shift_id,
            employees:staff_id (
              full_name,
              avatar_url
            ),
            shifts:shift_id (
              shift_date,
              start_time,
              end_time,
              role,
              location_id,
              locations:location_id (
                name
              )
            )
          )
        `)
        .eq("target_response", "accepted")
        .is("manager_approved_at", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useApproveSwapRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("shift_swap_requests")
        .update({ 
          manager_approved_by: user.id,
          manager_approved_at: new Date().toISOString(),
          status: "completed"
        })
        .eq("id", requestId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-swap-requests"] });
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      toast.success("Shift swap approved");
    },
    onError: (error) => {
      toast.error("Failed to approve swap: " + error.message);
    },
  });
};

export const useRejectSwapRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("shift_swap_requests")
        .update({ 
          manager_approved_by: user.id,
          manager_approved_at: new Date().toISOString(),
          status: "declined"
        })
        .eq("id", requestId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-swap-requests"] });
      toast.success("Shift swap rejected");
    },
    onError: (error) => {
      toast.error("Failed to reject swap: " + error.message);
    },
  });
};
