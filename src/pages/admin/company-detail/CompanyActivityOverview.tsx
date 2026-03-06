import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Building, ListChecks, ClipboardList, AlertTriangle, Clock, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CompanyOverview } from "./useCompanyOverview";

interface Props {
  overview: CompanyOverview;
}

export function CompanyActivityOverview({ overview }: Props) {
  const lastActivity = [overview.last_audit_at, overview.last_task_at, overview.last_shift_at]
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const stats = [
    { label: "Locations", value: overview.locations_count, icon: MapPin, color: "text-blue-500" },
    { label: "Employees", value: overview.employees_count, icon: Users, color: "text-green-500" },
    { label: "Departments", value: overview.departments_count, icon: Building, color: "text-purple-500" },
    { label: "Tasks", value: `${overview.tasks_completed}/${overview.tasks_total}`, icon: ListChecks, color: "text-orange-500", sub: "completed" },
    { label: "Audit Templates", value: overview.audit_templates_count, icon: ClipboardList, color: "text-cyan-500" },
    { label: "Audits Done", value: overview.audits_count, icon: ClipboardList, color: "text-teal-500" },
    { label: "Corrective Actions", value: overview.corrective_actions_count, icon: AlertTriangle, color: "text-yellow-500" },
    { label: "Shifts Created", value: overview.shifts_count, icon: Clock, color: "text-indigo-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Overview
          </CardTitle>
          <Badge variant={lastActivity ? "default" : "secondary"} className="text-xs">
            {lastActivity
              ? `Last active ${formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}`
              : "No activity yet"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Icon className={`h-5 w-5 shrink-0 ${s.color}`} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                  <p className="text-lg font-bold leading-tight">{s.value}</p>
                  {s.sub && <p className="text-[10px] text-muted-foreground">{s.sub}</p>}
                </div>
              </div>
            );
          })}
        </div>
        {overview.owner_email && (
          <p className="text-xs text-muted-foreground mt-4">
            Owner: <span className="font-medium text-foreground">{overview.owner_email}</span>
            {" · "}{overview.company_users_count} user{overview.company_users_count !== 1 ? "s" : ""} registered
          </p>
        )}
      </CardContent>
    </Card>
  );
}
