import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, CheckCircle, XCircle, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, format } from "date-fns";

export function WhatsAppStatsWidget() {
  const { company, modules } = useCompanyContext();
  const isActive = modules?.some(
    (m: any) => m.module_name === "whatsapp_messaging" && m.is_active
  );

  const { data: stats, isLoading } = useQuery({
    queryKey: ["whatsapp-stats", company?.id],
    enabled: !!company?.id && !!isActive,
    queryFn: async () => {
      const since = format(subDays(new Date(), 7), "yyyy-MM-dd'T'00:00:00'Z'");

      const [sentRes, failedRes, deliveredRes, optInRes] = await Promise.all([
        supabase
          .from("outbound_messages")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company!.id)
          .gte("created_at", since),
        supabase
          .from("outbound_messages")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company!.id)
          .eq("status", "failed")
          .gte("created_at", since),
        supabase
          .from("outbound_messages")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company!.id)
          .eq("status", "delivered")
          .gte("created_at", since),
        supabase
          .from("employee_messaging_preferences")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company!.id)
          .eq("whatsapp_opt_in", true),
      ]);

      const total = sentRes.count ?? 0;
      const failed = failedRes.count ?? 0;
      const delivered = deliveredRes.count ?? 0;
      const optedIn = optInRes.count ?? 0;

      return { total, failed, delivered, optedIn };
    },
  });

  if (!isActive) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            WhatsApp (7 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = [
    { label: "Sent", value: stats?.total ?? 0, icon: MessageSquare, color: "text-blue-600" },
    { label: "Delivered", value: stats?.delivered ?? 0, icon: CheckCircle, color: "text-green-600" },
    { label: "Failed", value: stats?.failed ?? 0, icon: XCircle, color: "text-destructive" },
    { label: "Opted In", value: stats?.optedIn ?? 0, icon: Users, color: "text-primary" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-green-600" />
          WhatsApp (Last 7 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.label} className="text-center space-y-1">
              <item.icon className={`h-5 w-5 mx-auto ${item.color}`} />
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
