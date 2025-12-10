import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMaintenanceTasks, useUpdateMaintenanceTask, useCreateMaintenanceTask } from "@/hooks/useOperationsAgent";
import { useLocations } from "@/hooks/useLocations";
import { useEquipment } from "@/hooks/useEquipment";
import { Plus, Wrench, AlertTriangle, CheckCircle2, Clock, Play, Bot } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

export default function MaintenanceTasks() {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    location_id: "",
    equipment_id: "",
    task_type: "",
    scheduled_for: "",
    notes: "",
  });

  const { data: locations } = useLocations();
  const { data: equipment } = useEquipment();
  const { data: tasks, isLoading, refetch } = useMaintenanceTasks({
    locationId: selectedLocation || undefined,
    status: selectedStatus || undefined,
  });
  const updateTask = useUpdateMaintenanceTask();
  const createTask = useCreateMaintenanceTask();

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        status: newStatus as any,
        ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
      });
      toast.success("Task status updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.location_id || !newTask.task_type || !newTask.scheduled_for) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      await createTask.mutateAsync({
        location_id: newTask.location_id,
        equipment_id: newTask.equipment_id || null,
        task_type: newTask.task_type,
        scheduled_for: new Date(newTask.scheduled_for).toISOString(),
        notes: newTask.notes || null,
        status: "pending",
        completed_at: null,
        created_by_agent: false,
      });
      toast.success("Task created");
      setIsDialogOpen(false);
      setNewTask({ location_id: "", equipment_id: "", task_type: "", scheduled_for: "", notes: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/10 text-blue-500"><Play className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case "overdue":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Overdue</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Tasks</h1>
          <p className="text-muted-foreground">Manage equipment maintenance and scheduled tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Locations</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Maintenance Task</DialogTitle>
                <DialogDescription>Schedule a new maintenance task</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Select value={newTask.location_id} onValueChange={(v) => setNewTask({ ...newTask, location_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Equipment (optional)</Label>
                  <Select value={newTask.equipment_id} onValueChange={(v) => setNewTask({ ...newTask, equipment_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment?.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Task Type *</Label>
                  <Input
                    value={newTask.task_type}
                    onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                    placeholder="e.g., Routine Inspection, Repair, Calibration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scheduled For *</Label>
                  <Input
                    type="datetime-local"
                    value={newTask.scheduled_for}
                    onChange={(e) => setNewTask({ ...newTask, scheduled_for: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTask} disabled={createTask.isPending}>Create Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>All maintenance tasks sorted by scheduled date</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tasks && tasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{task.task_type}</span>
                      </div>
                      {task.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">{task.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>{task.location?.name || "-"}</TableCell>
                    <TableCell>{task.equipment?.name || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(task.scheduled_for), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>
                      {task.created_by_agent ? (
                        <Badge variant="outline" className="gap-1">
                          <Bot className="h-3 w-3" /> Agent
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Manual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={task.status}
                        onValueChange={(v) => handleStatusChange(task.id, v)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No maintenance tasks found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
