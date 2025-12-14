import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PresenceUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  viewing_location?: string;
  online_at: string;
}

export const useSchedulePresence = (weekKey: string, locationId?: string) => {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null);
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch current user's profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setUserProfile(data);
      }
    };
    
    fetchProfile();
  }, [user]);

  const updatePresence = useCallback(async () => {
    if (!channelRef.current || !user) return;
    
    await channelRef.current.track({
      id: user.id,
      email: user.email || '',
      full_name: userProfile?.full_name || user.email?.split('@')[0] || 'Unknown',
      avatar_url: userProfile?.avatar_url,
      viewing_location: locationId || 'all',
      online_at: new Date().toISOString(),
    });
  }, [user, userProfile, locationId]);

  useEffect(() => {
    if (!user) return;

    const channelName = `schedule-presence-${weekKey}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            // Don't include current user
            if (presence.id !== user.id) {
              users.push({
                id: presence.id,
                email: presence.email,
                full_name: presence.full_name,
                avatar_url: presence.avatar_url,
                viewing_location: presence.viewing_location,
                online_at: presence.online_at,
              });
            }
          });
        });
        
        setActiveUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined schedule view:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left schedule view:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await updatePresence();
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user, weekKey, updatePresence]);

  // Update presence when location or profile changes
  useEffect(() => {
    updatePresence();
  }, [locationId, userProfile, updatePresence]);

  return { activeUsers, currentUserId: user?.id };
};
