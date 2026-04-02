import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGovProjects } from "@/hooks/useGovProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, AlertTriangle, CheckCircle2, Clock, Pause } from "lucide-react";
import { format, isPast } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-blue-100 text-blue-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function GovDashboard() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useGovProjects();

  const kpis = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === "active").length;
    const completed = projects.filter(p => p.status === "completed").length;
    const onHold = projects.filter(p => p.status === "on_hold").length;
    const overdue = projects.filter(p =>
      p.end_date && isPast(new Date(p.end_date)) && p.status !== "completed" && p.status !== "cancelled"
    ).length;
    return { total, active, completed, onHold, overdue };
  }, [projects]);

  const recentProjects = projects.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Command Center</h1>
          <p className="text-muted-foreground mt-1">Government operations portfolio overview</p>
        </div>
        <Button onClick={() => navigate("/gov/projects/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{kpis.total}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <FolderOpen className="h-3.5 w-3.5" /> Total Projects
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{kpis.active}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3.5 w-3.5" /> Active
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{kpis.completed}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{kpis.onHold}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Pause className="h-3.5 w-3.5" /> On Hold
            </div>
          </CardContent>
        </Card>
        <Card className={kpis.overdue > 0 ? "border-red-200" : ""}>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${kpis.overdue > 0 ? "text-red-600" : ""}`}>{kpis.overdue}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Overdue
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Projects</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/gov/projects")}>
            View all
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading projects…</div>
          ) : recentProjects.length === 0 ? (
            <div className="text-center py-10">
              <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No projects yet.</p>
              <Button className="mt-3" size="sm" onClick={() => navigate("/gov/projects/new")}>
                Create first project
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recentProjects.map(project => (
                <div
                  key={project.id}
                  className="py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                  onClick={() => navigate(`/gov/projects/${project.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{project.title}</span>
                      {project.project_number && (
                        <span className="text-xs text-muted-foreground">{project.project_number}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {project.zone && (
                        <span className="text-xs text-muted-foreground">{project.zone.name}</span>
                      )}
                      {project.end_date && (
                        <span className={`text-xs ${isPast(new Date(project.end_date)) && project.status !== "completed" ? "text-red-500" : "text-muted-foreground"}`}>
                          Due {format(new Date(project.end_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${PRIORITY_COLORS[project.priority]}`} variant="secondary">
                      {project.priority}
                    </Badge>
                    <Badge className={`text-xs ${STATUS_COLORS[project.status]}`} variant="secondary">
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
