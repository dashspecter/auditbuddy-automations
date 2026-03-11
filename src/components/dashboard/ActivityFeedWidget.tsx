import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { formatDistanceToNow } from "date-fns";

export const ActivityFeedWidget = () => {
  const { company } = useCompanyContext();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-feed-widget", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Fetch from activity_logs — no company_id column, so we get user-scoped via RLS
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, activity_type, description, created_at")
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
    staleTime: 2 * 60 * 1000,
  });

  const getActivityIcon = (type: string) => {
    return <Activity className="h-3.5 w-3.5 text-primary" />;
  };

  const formatType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !logs?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity recorded.
          </p>
        ) : (
          <div className="space-y-0 max-h-80 overflow-y-auto">
            {logs.map((log, idx) => (
              <div
                key={log.id}
                className="flex gap-3 py-2.5 border-b border-border/30 last:border-0"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {getActivityIcon(log.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug truncate">{log.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {formatType(log.activity_type)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at!), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
