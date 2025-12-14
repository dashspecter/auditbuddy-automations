import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const useRealtimeShifts = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    console.log("Setting up realtime shifts subscription");
    
    const channel = supabase
      .channel('shifts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts'
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
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["shifts"] });
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
