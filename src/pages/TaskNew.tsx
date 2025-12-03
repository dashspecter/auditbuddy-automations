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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, Save, RefreshCw, Calendar, Users, User, Info, Clock } from "lucide-react";
import { useCreateTask } from "@/hooks/useTasks";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { useLocations } from "@/hooks/useLocations";
import { toast } from "sonner";
import { format } from "date-fns";

const TaskNew = () => {
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const { data: employees = [] } = useEmployees();
  const { data: roles = [] } = useEmployeeRoles();
  const { data: locations = [] } = useLocations();
  const [assignmentType, setAssignmentType] = useState<'employee' | 'role'>('role');

const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    start_at: "",
    duration_minutes: 30,
    assigned_to: "",
    assigned_role_id: "",
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
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : undefined,
        duration_minutes: formData.duration_minutes,
        assigned_to: assignmentType === 'employee' && formData.assigned_to ? formData.assigned_to : undefined,
        assigned_role_id: assignmentType === 'role' && formData.assigned_role_id ? formData.assigned_role_id : undefined,
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
                <Label htmlFor="start_at">Start Time</Label>
                <Input
                  id="start_at"
                  type="datetime-local"
                  value={formData.start_at}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, start_at: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">When the task becomes active</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Time Limit (minutes)</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={formData.duration_minutes.toString()}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, duration_minutes: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Time available to complete (countdown will show)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <div className="flex gap-2 mb-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant={assignmentType === 'employee' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setAssignmentType('employee');
                            setFormData(prev => ({ ...prev, assigned_role_id: '' }));
                          }}
                          className="flex-1"
                        >
                          <User className="h-4 w-4 mr-1" />
                          Employee
                          <Info className="h-3 w-3 ml-1 opacity-60" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-sm">Task assigned to a specific employee. Only that person will see and be responsible for this task.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant={assignmentType === 'role' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setAssignmentType('role');
                            setFormData(prev => ({ ...prev, assigned_to: '' }));
                          }}
                          className="flex-1"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Role
                          <Info className="h-3 w-3 ml-1 opacity-60" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-sm">Task assigned to all employees with this role at the selected location. Only visible when they have a scheduled shift.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {assignmentType === 'employee' ? (
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
                ) : (
                  <Select
                    value={formData.assigned_role_id || "unassigned"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, assigned_role_id: value === "unassigned" ? "" : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {roles.filter(role => role.id).map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {assignmentType === 'role' && (
                  <p className="text-xs text-muted-foreground">
                    All employees with this role can see and complete this task
                  </p>
                )}
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
