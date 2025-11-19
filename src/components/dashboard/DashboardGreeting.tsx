import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const DashboardGreeting = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, last_login')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || "User";
  const lastLogin = profile?.last_login;

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {getGreeting()}, {displayName}!
            </h3>
          </div>
          {lastLogin && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-11">
              <Calendar className="h-4 w-4" />
              <span>
                Last login: {formatDistanceToNow(new Date(lastLogin), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};