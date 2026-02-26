import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ScoutNotification {
  id: string;
  scout_id: string;
  job_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function useScoutNotifications(scoutId: string | null) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["scout-notifications", scoutId],
    queryFn: async () => {
      if (!scoutId) return [];
      const { data, error } = await supabase
        .from("scout_notifications")
        .select("*")
        .eq("scout_id", scoutId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ScoutNotification[];
    },
    enabled: !!scoutId,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("scout_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scout-notifications", scoutId] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!scoutId) return;
      const { error } = await supabase
        .from("scout_notifications")
        .update({ is_read: true })
        .eq("scout_id", scoutId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scout-notifications", scoutId] });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!scoutId) return;

    const channel = supabase
      .channel(`scout-notifications-${scoutId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scout_notifications",
          filter: `scout_id=eq.${scoutId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["scout-notifications", scoutId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scoutId, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
