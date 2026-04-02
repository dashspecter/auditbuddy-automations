import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGovProjects, GovProjectFilters, ProjectStatus, ProjectType } from "@/hooks/useGovProjects";
import { useGovZones } from "@/hooks/useGovZones";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Plus, Search, MapPin, Calendar, User } from "lucide-react";
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

const PROJECT_TYPE_LABELS: Record<string, string> = {
  infrastructure: "Infrastructure",
  maintenance: "Maintenance",
  sanitation: "Sanitation",
  parks: "Parks & Green",
  construction: "Construction",
  inspection: "Inspection",
  emergency: "Emergency",
};

export default function Projects() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");

  const filters = useMemo<GovProjectFilters>(() => ({
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: [statusFilter as ProjectStatus] } : {}),
    ...(typeFilter !== "all" ? { project_type: [typeFilter as ProjectType] } : {}),
    ...(zoneFilter !== "all" ? { zone_id: zoneFilter } : {}),
  }), [search, statusFilter, typeFilter, zoneFilter]);

  const { data: projects = [], isLoading } = useGovProjects(filters);
  const { data: zones = [] } = useGovZones();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage public works and field operations projects</p>
        </div>
        <Button onClick={() => navigate("/gov/projects/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(PROJECT_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {zones.length > 0 && (
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All zones</SelectItem>
              {zones.map(z => (
                <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Project List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading projects…</div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              {search || statusFilter !== "all" || typeFilter !== "all" || zoneFilter !== "all"
                ? "No projects match your filters."
                : "No projects yet. Create your first one."}
            </p>
            {!search && statusFilter === "all" && typeFilter === "all" && zoneFilter === "all" && (
              <Button className="mt-4" onClick={() => navigate("/gov/projects/new")}>
                <Plus className="h-4 w-4 mr-2" /> New Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map(project => {
            const isOverdue =
              project.end_date &&
              isPast(new Date(project.end_date)) &&
              project.status !== "completed" &&
              project.status !== "cancelled";
            return (
              <Card
                key={project.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? "border-red-200" : ""}`}
                onClick={() => navigate(`/gov/projects/${project.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{project.title}</span>
                        {project.project_number && (
                          <span className="text-xs text-muted-foreground font-mono">{project.project_number}</span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {project.zone && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {project.zone.name}
                          </span>
                        )}
                        {project.project_manager && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {project.project_manager.full_name}
                          </span>
                        )}
                        {project.end_date && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
                            <Calendar className="h-3 w-3" />
                            {isOverdue ? "Overdue · " : "Due "}
                            {format(new Date(project.end_date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge className={`text-xs ${STATUS_COLORS[project.status]}`} variant="secondary">
                        {project.status.replace("_", " ")}
                      </Badge>
                      <Badge className={`text-xs ${PRIORITY_COLORS[project.priority]}`} variant="secondary">
                        {project.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{PROJECT_TYPE_LABELS[project.project_type]}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
