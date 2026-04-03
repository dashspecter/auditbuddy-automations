import { useMemo } from "react";
import { ClipboardCheck, ListTodo, Users } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export const TodaySnapshotRow = () => {
  const { t } = useTranslation();
  const { company } = useCompanyContext();
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const { data: auditCount, isLoading: auditsLoading } = useQuery({
    queryKey: ["today-expected-audits", company?.id, today],
    queryFn: async () => {
      if (!company?.id) return 0;
      const { count, error } = await supabase
        .from("location_audits")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("audit_date", today);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!company?.id,
  });

  const { data: taskCount, isLoading: tasksLoading } = useQuery({
    queryKey: ["today-expected-tasks", company?.id, today],
    queryFn: async () => {
      if (!company?.id) return 0;
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59`;
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .gte("due_at", startOfDay)
        .lte("due_at", endOfDay);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!company?.id,
  });

  const { data: employeesAtWork, isLoading: attendanceLoading } = useQuery({
    queryKey: ["today-employees-at-work", company?.id, today],
    queryFn: async () => {
      if (!company?.id) return 0;
      const startOfDay = `${today}T00:00:00`;
      const { count, error } = await supabase
        .from("attendance_logs")
        .select("*", { count: "exact", head: true })
        .gte("check_in_at", startOfDay)
        .not("check_in_at", "is", null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!company?.id,
  });

  const isLoading = auditsLoading || tasksLoading || attendanceLoading;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">
        {t("dashboard.today", "Today")}
      </h3>
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title={t("dashboard.expectedAudits", "Expected Audits")}
          value={isLoading ? "..." : (auditCount ?? 0).toString()}
          icon={ClipboardCheck}
          description={t("dashboard.scheduledForToday", "Scheduled for today")}
        />
        <StatsCard
          title={t("dashboard.expectedTasks", "Expected Tasks")}
          value={isLoading ? "..." : (taskCount ?? 0).toString()}
          icon={ListTodo}
          description={t("dashboard.dueToday", "Due today")}
        />
        <StatsCard
          title={t("dashboard.employeesAtWork", "Employees at Work")}
          value={isLoading ? "..." : (employeesAtWork ?? 0).toString()}
          icon={Users}
          description={t("dashboard.clockedInToday", "Clocked in today")}
        />
      </div>
    </div>
  );
};
