import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

export interface NotificationRead {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string;
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
        .select('*')
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
  };
};
