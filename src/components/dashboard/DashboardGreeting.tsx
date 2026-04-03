import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

export const DashboardGreeting = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, last_login")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greeting.goodMorning");
    if (hour < 18) return t("dashboard.greeting.goodAfternoon");
    return t("dashboard.greeting.goodEvening");
  };

  const rawName =
    profile?.full_name || user?.email?.split("@")[0] || t("common.user");
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const lastLogin = profile?.last_login;

  return (
    <Card className="p-3 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 p-1.5 rounded-full">
          <User className="h-4 w-4 text-primary" />
        </div>
        <span className="text-base font-medium text-foreground">
          {getGreeting()}, {displayName}!
        </span>
        {lastLogin && (
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {t("dashboard.greeting.lastLogin")}{" "}
            {formatDistanceToNow(new Date(lastLogin), { addSuffix: true })}
          </span>
        )}
      </div>
    </Card>
  );
};
