import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'announcement';
  target_roles: string[];
  is_active: boolean;
  created_at: string;
  created_by: string;
  expires_at: string | null;
  scheduled_for: string | null;
  audit_id: string | null;
  location_audits?: {
    id: string;
    location: string;
    audit_date: string;
  } | null;
}

export interface NotificationRead {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string;
  snoozed_until: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          location_audits:audit_id (
            id,
            location,
            audit_date
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const { data: readNotifications = [] } = useQuery({
    queryKey: ['notification_reads', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('notification_reads')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as NotificationRead[];
    },
    enabled: !!user,
  });

  // Set up realtime subscription for notification reads
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notification-reads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_reads',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notification_reads', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notification_reads')
        .insert({
          notification_id: notificationId,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_reads', user?.id] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Get all unread notification IDs
      const unreadIds = notifications
        .filter(n => !readNotifications.some(read => read.notification_id === n.id))
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      // Insert read records for all unread notifications
      const { error } = await supabase
        .from('notification_reads')
        .insert(
          unreadIds.map(id => ({
            notification_id: id,
            user_id: user.id,
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_reads', user?.id] });
    },
  });

  const snoozeNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('User not authenticated');

      // Snooze until end of day
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Check if a read record exists
      const existing = readNotifications.find(r => r.notification_id === notificationId);

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('notification_reads')
          .update({ snoozed_until: endOfDay.toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new record with snooze
        const { error } = await supabase
          .from('notification_reads')
          .insert({
            notification_id: notificationId,
            user_id: user.id,
            snoozed_until: endOfDay.toISOString(),
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notification_reads', user?.id] });
    },
  });

  const unreadNotifications = notifications.filter(
    (notification) => !readNotifications.some((read) => read.notification_id === notification.id)
  );

  const unreadCount = unreadNotifications.length;

  return {
    notifications,
    unreadNotifications,
    unreadCount,
    readNotifications,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarkingAllAsRead: markAllAsRead.isPending,
    snoozeNotification: snoozeNotification.mutate,
    isSnoozingNotification: snoozeNotification.isPending,
  };
};
