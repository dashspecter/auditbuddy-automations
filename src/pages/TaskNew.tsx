import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, RefreshCw, Calendar } from "lucide-react";
import { useCreateTask } from "@/hooks/useTasks";
import { useEmployees } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { toast } from "sonner";
import { format } from "date-fns";

const TaskNew = () => {
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocations();

const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_at: "",
    assigned_to: "",
    location_id: "",
    recurrence_type: "none",
    recurrence_interval: 1,
    recurrence_end_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    try {
      await createTask.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        due_at: formData.due_at ? new Date(formData.due_at).toISOString() : undefined,
        assigned_to: formData.assigned_to || undefined,
        location_id: formData.location_id || undefined,
        source: "manual",
        recurrence_type: formData.recurrence_type !== "none" ? formData.recurrence_type : undefined,
        recurrence_interval: formData.recurrence_type !== "none" ? formData.recurrence_interval : undefined,
        recurrence_end_date: formData.recurrence_type !== "none" && formData.recurrence_end_date
          ? new Date(formData.recurrence_end_date).toISOString()
          : undefined,
      });

      toast.success("Task created successfully");
      navigate("/tasks");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tasks")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Task</h1>
          <p className="text-muted-foreground mt-1">
            Add a new task to your workflow
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_at">Due Date</Label>
                <Input
                  id="due_at"
                  type="datetime-local"
                  value={formData.due_at}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, due_at: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assign To</Label>
                <Select
                  value={formData.assigned_to || "unassigned"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, assigned_to: value === "unassigned" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.filter(emp => emp.id).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_id">Location</Label>
                <Select
                  value={formData.location_id || "no-location"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, location_id: value === "no-location" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-location">No location</SelectItem>
                    {locations.filter(loc => loc.id).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recurrence Section */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Recurrence Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Repeat</Label>
                    <Select
                      value={formData.recurrence_type}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, recurrence_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Does not repeat</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.recurrence_type !== "none" && (
                    <>
                      <div className="space-y-2">
                        <Label>Every</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={formData.recurrence_interval}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                recurrence_interval: parseInt(e.target.value) || 1,
                              }))
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            {formData.recurrence_type === "daily"
                              ? "day(s)"
                              : formData.recurrence_type === "weekly"
                              ? "week(s)"
                              : "month(s)"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>End Date (Optional)</Label>
                        <Input
                          type="date"
                          value={formData.recurrence_end_date}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              recurrence_end_date: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                {formData.recurrence_type !== "none" && (
                  <p className="text-sm text-muted-foreground">
                    This task will repeat{" "}
                    {formData.recurrence_interval > 1
                      ? `every ${formData.recurrence_interval} `
                      : ""}
                    {formData.recurrence_type === "daily"
                      ? formData.recurrence_interval > 1
                        ? "days"
                        : "daily"
                      : formData.recurrence_type === "weekly"
                      ? formData.recurrence_interval > 1
                        ? "weeks"
                        : "weekly"
                      : formData.recurrence_interval > 1
                      ? "months"
                      : "monthly"}
                    {formData.recurrence_end_date
                      ? ` until ${format(new Date(formData.recurrence_end_date), "PPP")}`
                      : ""}
                    .
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/tasks/calendar")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Calendar
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/tasks")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTask.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {createTask.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskNew;
