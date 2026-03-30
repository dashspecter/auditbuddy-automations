import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CA_OPEN_STATUSES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, ListTodo, Shield, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useLabels } from "@/hooks/useLabels";
import { useTranslation } from "react-i18next";

interface DepartmentHealth {
  id: string;
  name: string;
  auditScore: number | null;
  taskCompletion: number;
  openCAs: number;
  staffCount: number;
}

export const DepartmentHealthGrid = () => {
  const { t } = useTranslation();
  const { company } = useCompanyContext();
  const { label } = useLabels();

  const { data: departments, isLoading } = useQuery({
    queryKey: ["department-health-grid", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Get all locations (departments in gov context)
      const { data: locations, error: locError } = await supabase
        .from("locations")
        .select("id, name")
        .eq("company_id", company.id);

      if (locError) throw locError;
      if (!locations?.length) return [];

      // Get latest audit scores per location
      const { data: audits } = await supabase
        .from("location_audits")
        .select("location_id, overall_score")
        .eq("company_id", company.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      // Get tasks stats per location
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, status, task_locations!inner(location_id)")
        .eq("company_id", company.id);

      // Get open CAs per location
      const { data: cas } = await supabase
        .from("corrective_actions")
        .select("id, status, location_id")
        .eq("company_id", company.id)
        .in("status", CA_OPEN_STATUSES);

      // Get staff count per location
      const { data: staff } = await supabase
        .from("employees")
        .select("id, location_id")
        .eq("company_id", company.id)
        .eq("status", "active");

      const result: DepartmentHealth[] = locations.map((loc) => {
        // Latest audit score for this location
        const locAudits = audits?.filter((a) => a.location_id === loc.id) || [];
        const auditScore = locAudits.length > 0 ? locAudits[0].overall_score : null;

        // Task completion for this location
        const locTasks = tasks?.filter((t: any) =>
          t.task_locations?.some((tl: any) => tl.location_id === loc.id)
        ) || [];
        const completedTasks = locTasks.filter((t: any) => t.status === "completed").length;
        const taskCompletion = locTasks.length > 0 ? Math.round((completedTasks / locTasks.length) * 100) : 0;

        // Open CAs
        const openCAs = cas?.filter((c) => c.location_id === loc.id).length || 0;

        // Staff count
        const staffCount = staff?.filter((s) => s.location_id === loc.id).length || 0;

        return {
          id: loc.id,
          name: loc.name,
          auditScore,
          taskCompletion,
          openCAs,
          staffCount,
        };
      });

      return result.sort((a, b) => (a.auditScore ?? 0) - (b.auditScore ?? 0));
    },
    enabled: !!company?.id,
  });

  const getHealthColor = (score: number | null) => {
    if (score === null) return "bg-muted text-muted-foreground";
    if (score >= 80) return "bg-success/10 text-success border-success/20";
    if (score >= 60) return "bg-warning/10 text-warning border-warning/20";
    return "bg-destructive/10 text-destructive border-destructive/20";
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return "secondary";
    if (score >= 80) return "default";
    if (score >= 60) return "warning";
    return "destructive";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            {label("locations", "Department")} Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!departments?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            {label("locations", "Department")} Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No {label("locations", "departments").toLowerCase()} found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5 text-primary" />
          {label("locations", "Department")} Health Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className={`rounded-lg border p-4 transition-colors ${getHealthColor(dept.auditScore)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm truncate flex-1">{dept.name}</h4>
                <Badge variant={getScoreBadge(dept.auditScore) as any} className="text-xs ml-2">
                  {dept.auditScore !== null ? `${dept.auditScore}%` : "N/A"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex flex-col items-center gap-1">
                  <ListTodo className="h-3.5 w-3.5" />
                  <span className="font-medium">{dept.taskCompletion}%</span>
                  <span className="text-muted-foreground">Tasks</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  <span className="font-medium">{dept.openCAs}</span>
                  <span className="text-muted-foreground">Open CAs</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium">{dept.staffCount}</span>
                  <span className="text-muted-foreground">Staff</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
