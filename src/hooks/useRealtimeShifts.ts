import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useCompany";

export const useRealtimeShifts = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompany();

  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel(`shifts-realtime-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          console.log('Shift change received:', payload.eventType);
          
          // Only show toast if the change was made by someone else
          const changedBy = (payload.new as any)?.created_by || (payload.old as any)?.created_by;
          const isOtherUser = changedBy && changedBy !== user?.id;
          
          if (isOtherUser) {
            if (payload.eventType === 'INSERT') {
              toast.info('New shift added by another user', { 
                description: 'The schedule has been updated',
                duration: 3000 
              });
            } else if (payload.eventType === 'UPDATE') {
              toast.info('Shift updated by another user', { 
                description: 'The schedule has been updated',
                duration: 3000 
              });
            } else if (payload.eventType === 'DELETE') {
              toast.info('Shift removed by another user', { 
                description: 'The schedule has been updated',
                duration: 3000 
              });
            }
          }
          
          // exact:false ensures ALL parameterized shift queries get invalidated
          // (e.g. ["shifts", locationId, startDate, endDate] and ["kiosk-shifts", ...])
          queryClient.invalidateQueries({ queryKey: ["shifts"], exact: false });
          queryClient.invalidateQueries({ queryKey: ["kiosk-shifts"], exact: false });
          queryClient.invalidateQueries({ queryKey: ["employee-shifts-multiweek"], exact: false });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_assignments'
        },
        (payload) => {
          console.log('Shift assignment change received:', payload.eventType);
          
          // Invalidate shifts to refresh assignments
          queryClient.invalidateQueries({ queryKey: ["shifts"] });
          queryClient.invalidateQueries({ queryKey: ["employee-shifts-multiweek"] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime shifts subscription status:', status);
      });

    return () => {
      console.log("Cleaning up realtime shifts subscription");
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);
};
