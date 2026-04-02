import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGovProjectById, useUpdateGovProject } from "@/hooks/useGovProjects";
import { useProjectWorkOrders } from "@/hooks/useProjectWorkOrders";
import { useProjectMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from "@/hooks/useProjectMilestones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ExternalLink, Plus, CheckCircle2, Circle,
  Clock, AlertCircle, Trash2, Calendar, DollarSign, User, MapPin
} from "lucide-react";
import { format, isPast } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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

const WO_STATUS_COLORS: Record<string, string> = {
  Open: "bg-slate-100 text-slate-700",
  OnHold: "bg-amber-100 text-amber-700",
  InProgress: "bg-blue-100 text-blue-700",
  Done: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const MILESTONE_ICON: Record<string, JSX.Element> = {
  pending: <Circle className="h-4 w-4 text-slate-400" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  missed: <AlertCircle className="h-4 w-4 text-red-500" />,
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useGovProjectById(id);
  const { data: workOrders = [] } = useProjectWorkOrders(id);
  const { data: milestones = [] } = useProjectMilestones(id);
  const updateProject = useUpdateGovProject();
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");

  if (isLoading) {
    return <div className="text-center py-16 text-muted-foreground">Loading project…</div>;
  }
  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Project not found.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/gov/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  const handleStatusChange = (status: string) => {
    updateProject.mutate({ id: project.id, status: status as any });
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim() || !id) return;
    await createMilestone.mutateAsync({
      project_id: id,
      title: newMilestoneTitle.trim(),
      description: newMilestoneDesc || undefined,
      due_date: newMilestoneDue || undefined,
    });
    setMilestoneDialogOpen(false);
    setNewMilestoneTitle("");
    setNewMilestoneDue("");
    setNewMilestoneDesc("");
  };

  const isOverdue =
    project.end_date &&
    isPast(new Date(project.end_date)) &&
    project.status !== "completed" &&
    project.status !== "cancelled";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/gov/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{project.title}</h1>
            {project.project_number && (
              <span className="text-sm text-muted-foreground font-mono">{project.project_number}</span>
            )}
            <Badge className={`text-xs ${STATUS_COLORS[project.status]}`} variant="secondary">
              {project.status.replace("_", " ")}
            </Badge>
            <Badge className={`text-xs ${PRIORITY_COLORS[project.priority]}`} variant="secondary">
              {project.priority}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
            {project.zone && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{project.zone.name}</span>}
            {project.project_manager && <span className="flex items-center gap-1"><User className="h-3 w-3" />{project.project_manager.full_name}</span>}
            {project.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Start: {format(new Date(project.start_date), "MMM d, yyyy")}</span>}
            {project.end_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
                <Calendar className="h-3 w-3" />{isOverdue ? "Overdue · " : "Due: "}{format(new Date(project.end_date), "MMM d, yyyy")}
              </span>
            )}
            {project.budget != null && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />Budget: {project.budget.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <Select value={project.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-36 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="work_orders">
        <TabsList>
          <TabsTrigger value="work_orders">Work Orders ({workOrders.length})</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
        </TabsList>

        {/* Work Orders Tab */}
        <TabsContent value="work_orders" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              CMMS work orders linked to this project.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate("/cmms/work-orders")}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Manage in CMMS
            </Button>
          </div>
          {workOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10">
                <p className="text-sm text-muted-foreground">No work orders linked to this project yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Go to CMMS → Work Orders and set the Project field when creating a work order.
                </p>
                <Button className="mt-4" size="sm" onClick={() => navigate("/cmms/work-orders")}>
                  <Plus className="h-4 w-4 mr-1.5" /> Create Work Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            workOrders.map(wo => (
              <Card
                key={wo.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/cmms/work-orders/${wo.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">WO-{wo.wo_number}</span>
                      <span className="font-medium text-sm truncate">{wo.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{wo.type}</span>
                      {wo.location && <span>· {wo.location.name}</span>}
                      {wo.due_at && <span>· Due {format(new Date(wo.due_at), "MMM d")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${WO_STATUS_COLORS[wo.status] ?? ""}`} variant="secondary">
                      {wo.status}
                    </Badge>
                    <Badge className={`text-xs ${PRIORITY_COLORS[wo.priority.toLowerCase()] ?? ""}`} variant="secondary">
                      {wo.priority}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Track key milestones and attach evidence.</p>
            <Button size="sm" onClick={() => setMilestoneDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Milestone
            </Button>
          </div>
          {milestones.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10">
                <p className="text-sm text-muted-foreground">No milestones yet.</p>
              </CardContent>
            </Card>
          ) : (
            milestones.map(m => {
              const isLate = m.due_date && isPast(new Date(m.due_date)) && m.status !== "completed";
              return (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <button
                      className="shrink-0"
                      onClick={() => updateMilestone.mutate({
                        id: m.id,
                        project_id: m.project_id,
                        status: m.status === "completed" ? "pending" : "completed",
                      })}
                    >
                      {MILESTONE_ICON[m.status]}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium text-sm ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {m.title}
                      </span>
                      {m.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                      )}
                      {m.due_date && (
                        <p className={`text-xs mt-0.5 ${isLate ? "text-red-500" : "text-muted-foreground"}`}>
                          Due {format(new Date(m.due_date), "MMM d, yyyy")}
                          {isLate && " · Overdue"}
                        </p>
                      )}
                    </div>
                    <button
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                      onClick={() => deleteMilestone.mutate({ id: m.id, project_id: m.project_id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Add Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Segment A complete"
                value={newMilestoneTitle}
                onChange={e => setNewMilestoneTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description…"
                rows={2}
                value={newMilestoneDesc}
                onChange={e => setNewMilestoneDesc(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={newMilestoneDue} onChange={e => setNewMilestoneDue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMilestone} disabled={!newMilestoneTitle.trim() || createMilestone.isPending}>
              {createMilestone.isPending ? "Adding…" : "Add Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
