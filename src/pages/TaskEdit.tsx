import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, RefreshCw, Calendar, Users, User, Info, Clock, MapPin, Flag, Share2, UserCheck, Camera, Plus, X as XIcon } from "lucide-react";
import { useUpdateTask, useTasks } from "@/hooks/useTasks";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { LocationMultiSelector } from "@/components/LocationMultiSelector";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { getOriginalTaskId } from "@/lib/taskOccurrenceEngine";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { saveTaskEvidencePolicy } from "@/lib/saveTaskEvidencePolicy";
import { supabase } from "@/integrations/supabase/client";

const TaskEdit = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company } = useCompanyContext();
  
  const id = rawId ? getOriginalTaskId(rawId) : undefined;
  const updateTask = useUpdateTask();
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks();
  const { data: employees = [] } = useEmployees();
  const { data: roles = [] } = useEmployeeRoles();
  const [assignmentType, setAssignmentType] = useState<'employee' | 'role'>('role');
  const [isIndividual, setIsIndividual] = useState(false);
  const [recurrenceTimes, setRecurrenceTimes] = useState<string[]>([]);
  const [newTimeInput, setNewTimeInput] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialStartAt, setInitialStartAt] = useState<string | null>(null);

  // Evidence policy state
  const [evidenceRequired, setEvidenceRequired] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [evidenceInstructions, setEvidenceInstructions] = useState("");
  const [evidencePolicyId, setEvidencePolicyId] = useState<string | null>(null);

  const task = tasks.find(t => t.id === id);

  // Load existing evidence policy for this task
  useEffect(() => {
    if (!id || !user?.id) return;
    const loadPolicy = async () => {
      const { data } = await supabase
        .from("evidence_policies")
        .select("*")
        .eq("applies_to", "task_template")
        .eq("applies_id", id)
        .maybeSingle();
      if (data) {
        setEvidencePolicyId(data.id);
        setEvidenceRequired(data.evidence_required);
        setReviewRequired(data.review_required);
        setEvidenceInstructions(data.instructions ?? "");
      } else {
        // Explicitly reset if no policy found
        setEvidencePolicyId(null);
        setEvidenceRequired(false);
        setReviewRequired(false);
        setEvidenceInstructions("");
      }
    };
    loadPolicy();
  }, [id, user?.id]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    start_at: "",
    duration_minutes: 30,
    assigned_to: "",
    assigned_role_ids: [] as string[],
    location_ids: [] as string[],
    recurrence_type: "none",
    recurrence_interval: 1,
    recurrence_end_date: "",
    recurrence_days_of_week: [] as number[],
    recurrence_days_of_month: [] as number[],
  });

  // Initialize form with task data
  useEffect(() => {
    if (task && !isInitialized) {
      // Fetch task_roles and task_locations from junction tables
      const loadRelations = async () => {
        const [{ data: taskRoles }, { data: taskLocations }] = await Promise.all([
          supabase.from("task_roles").select("role_id").eq("task_id", task.id),
          supabase.from("task_locations").select("location_id").eq("task_id", task.id),
        ]);

        const roleIds = taskRoles && taskRoles.length > 0
          ? taskRoles.map(tr => tr.role_id)
          : task.assigned_role_id ? [task.assigned_role_id] : [];

        const locationIds = taskLocations && taskLocations.length > 0
          ? taskLocations.map(tl => tl.location_id)
          : task.location_id ? [task.location_id] : [];

        setFormData({
          title: task.title || "",
          description: task.description || "",
          priority: task.priority || "medium",
          start_at: task.start_at ? format(new Date(task.start_at), "yyyy-MM-dd'T'HH:mm") : "",
          duration_minutes: task.duration_minutes || 30,
          assigned_to: task.assigned_to || "",
          assigned_role_ids: roleIds,
          location_ids: locationIds,
          recurrence_type: task.recurrence_type || "none",
          recurrence_interval: task.recurrence_interval || 1,
          recurrence_end_date: task.recurrence_end_date 
            ? format(new Date(task.recurrence_end_date), "yyyy-MM-dd") 
            : "",
          recurrence_days_of_week: task.recurrence_days_of_week || [],
          recurrence_days_of_month: task.recurrence_days_of_month || [],
        });
        setAssignmentType(task.assigned_to ? 'employee' : 'role');
        setIsIndividual(task.is_individual || false);
        setRecurrenceTimes(task.recurrence_times ?? []);
        setInitialStartAt(task.start_at ? format(new Date(task.start_at), "yyyy-MM-dd'T'HH:mm") : "");
        setIsInitialized(true);
      };
      loadRelations();
    }
  }, [task, isInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    if (!formData.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    try {
      await updateTask.mutateAsync({
        id,
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        ...(formData.start_at !== initialStartAt ? { start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null } : {}),
        duration_minutes: formData.duration_minutes,
        assigned_to: assignmentType === 'employee' && formData.assigned_to ? formData.assigned_to : null,
        assigned_role_id: assignmentType === 'role' && formData.assigned_role_ids.length > 0 ? formData.assigned_role_ids[0] : null,
        assigned_role_ids: assignmentType === 'role' ? formData.assigned_role_ids : [],
        is_individual: assignmentType === 'role' ? isIndividual : false,
        location_id: formData.location_ids[0] || null,
        location_ids: formData.location_ids,
        recurrence_type: formData.recurrence_type !== "none" ? formData.recurrence_type : null,
        recurrence_interval: formData.recurrence_type !== "none" ? formData.recurrence_interval : null,
        recurrence_end_date: formData.recurrence_type !== "none" && formData.recurrence_end_date
          ? new Date(formData.recurrence_end_date).toISOString()
          : null,
        recurrence_days_of_week: formData.recurrence_type === "weekly" && formData.recurrence_days_of_week.length > 0
          ? formData.recurrence_days_of_week
          : null,
        recurrence_days_of_month: formData.recurrence_type === "monthly" && formData.recurrence_days_of_month.length > 0
          ? formData.recurrence_days_of_month
          : null,
        recurrence_times: recurrenceTimes.length >= 1 ? recurrenceTimes.sort() : null,
      });

      toast.success("Task updated successfully");

      // Save / remove evidence policy (isolated error handling)
      if (company?.id) {
        try {
          const { policyId, error: epError } = await saveTaskEvidencePolicy({
            companyId: company.id,
            taskId: id,
            evidenceRequired,
            reviewRequired,
            instructions: evidenceInstructions,
            existingPolicyId: evidencePolicyId,
          });
          if (epError) {
            toast.warning("Task saved, but evidence policy could not be updated");
          } else {
            setEvidencePolicyId(policyId);
          }
        } catch (epError) {
          console.error("Evidence policy save failed:", epError);
          toast.warning("Task saved, but evidence policy could not be updated");
        }
      }

      navigate("/tasks");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  if (isLoadingTasks) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/tasks")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Task not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tasks")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Task</h1>
          <p className="text-muted-foreground mt-1">Update task details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add task details..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scheduling Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_at">Start Date & Time</Label>
                <Input
                  id="start_at"
                  type="datetime-local"
                  value={formData.start_at}
                  onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select
                  value={String(formData.duration_minutes)}
                  onValueChange={(value) => setFormData({ ...formData, duration_minutes: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4 pr-6 md:border-r border-border">
                <div className="space-y-2">
                  <Label>Assign to</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={assignmentType === 'role' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAssignmentType('role')}
                      className="flex-1"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Role
                    </Button>
                    <Button
                      type="button"
                      variant={assignmentType === 'employee' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAssignmentType('employee')}
                      className="flex-1"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Employee
                    </Button>
                  </div>
                </div>

                {assignmentType === 'employee' ? (
                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">Employee</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor="assigned_role" className="flex items-center gap-1 cursor-help">
                            Role
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Tasks assigned to a role will be visible to all employees with that role who have an active shift at the task's location.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex flex-wrap gap-2 min-h-[38px] p-2 border rounded-md bg-background">
                      {formData.assigned_role_ids.length === 0 ? (
                        <span className="text-muted-foreground text-sm">Select roles...</span>
                      ) : (
                        formData.assigned_role_ids.map(roleId => {
                          const role = roles.find(r => r.id === roleId);
                          return role ? (
                            <span
                              key={roleId}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                            >
                              {role.name}
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  assigned_role_ids: prev.assigned_role_ids.filter(id => id !== roleId)
                                }))}
                                className="hover:text-destructive"
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                      {roles
                        .filter(role => !formData.assigned_role_ids.includes(role.id))
                        .map(role => (
                          <Button
                            key={role.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="justify-start text-xs h-8"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              assigned_role_ids: [...prev.assigned_role_ids, role.id]
                            }))}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {role.name}
                          </Button>
                        ))}
                    </div>

                    {/* Shared vs Individual toggle */}
                    {formData.assigned_role_ids.length > 0 && (
                      <div className="pt-3 border-t border-border mt-3">
                        <Label className="text-sm font-medium mb-2 block">Completion Type</Label>
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant={!isIndividual ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setIsIndividual(false)}
                                  className="flex-1"
                                >
                                  <Share2 className="h-4 w-4 mr-1" />
                                  Shared
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground">
                                <p className="text-sm">Any employee can complete - done for everyone once completed</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant={isIndividual ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setIsIndividual(true)}
                                  className="flex-1"
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Individual
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground">
                                <p className="text-sm">Each employee must complete the task themselves</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {isIndividual 
                            ? "Each employee with the selected role will need to complete this task individually"
                            : "The task is shared - any employee can complete it for everyone"
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Locations
                </Label>
                <LocationMultiSelector
                  value={formData.location_ids}
                  onValueChange={(ids) => setFormData({ ...formData, location_ids: ids })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recurrence Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Recurrence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="recurrence_type">Repeat</Label>
                <Select
                  value={formData.recurrence_type}
                  onValueChange={(value) => setFormData({ ...formData, recurrence_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No repeat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Don't repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence_type !== "none" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_interval">Every</Label>
                    <Select
                      value={String(formData.recurrence_interval)}
                      onValueChange={(value) => setFormData({ ...formData, recurrence_interval: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {formData.recurrence_type === 'daily' ? (n === 1 ? 'day' : 'days') :
                                formData.recurrence_type === 'weekly' ? (n === 1 ? 'week' : 'weeks') :
                                (n === 1 ? 'month' : 'months')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_end_date">Until (optional)</Label>
                    <Input
                      id="recurrence_end_date"
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Day of Week Selection for Weekly */}
            {formData.recurrence_type === "weekly" && (
              <div className="space-y-2">
                <Label>On these days</Label>
                <div className="flex flex-wrap gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                    <Button
                      key={day}
                      type="button"
                      variant={formData.recurrence_days_of_week.includes(index) ? "default" : "outline"}
                      size="sm"
                      className="w-12"
                      onClick={() => {
                        const days = formData.recurrence_days_of_week.includes(index)
                          ? formData.recurrence_days_of_week.filter(d => d !== index)
                          : [...formData.recurrence_days_of_week, index].sort((a, b) => a - b);
                        setFormData({ ...formData, recurrence_days_of_week: days });
                      }}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.recurrence_days_of_week.length === 0 
                    ? "Select at least one day" 
                    : `Repeats on ${formData.recurrence_days_of_week.map(d => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]).join(", ")}`}
                </p>
              </div>
            )}

            {/* Day of Month Selection for Monthly */}
            {formData.recurrence_type === "monthly" && (
              <div className="space-y-2">
                <Label>On these dates</Label>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={formData.recurrence_days_of_month.includes(day) ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => {
                        const days = formData.recurrence_days_of_month.includes(day)
                          ? formData.recurrence_days_of_month.filter(d => d !== day)
                          : [...formData.recurrence_days_of_month, day].sort((a, b) => a - b);
                        setFormData({ ...formData, recurrence_days_of_month: days });
                      }}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.recurrence_days_of_month.length === 0 
                    ? "Select at least one date" 
                    : `Repeats on the ${formData.recurrence_days_of_month.map(d => {
                        const suffix = d === 1 || d === 21 || d === 31 ? "st" : d === 2 || d === 22 ? "nd" : d === 3 || d === 23 ? "rd" : "th";
                        return `${d}${suffix}`;
                      }).join(", ")}`}
                </p>
              </div>
            )}

            {/* Multiple Daily Times */}
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="flex items-center gap-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Additional Daily Times
                </Label>
                <span className="text-xs text-muted-foreground">(optional – for tasks that repeat at multiple times per day)</span>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {recurrenceTimes.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm font-mono">
                    {t}
                    <button type="button" onClick={() => setRecurrenceTimes(prev => prev.filter(x => x !== t))} className="hover:text-destructive">
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="time"
                  value={newTimeInput}
                  onChange={e => setNewTimeInput(e.target.value)}
                  className="w-36"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newTimeInput && !recurrenceTimes.includes(newTimeInput)) {
                      setRecurrenceTimes(prev => [...prev, newTimeInput].sort());
                      setNewTimeInput("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Time
                </Button>
              </div>
              {recurrenceTimes.length >= 2 && (
                <p className="text-xs text-primary font-medium">✓ {recurrenceTimes.length} time slots — each will appear as a separate task occurrence per day</p>
              )}
              {recurrenceTimes.length === 1 && (
                <p className="text-xs text-muted-foreground">Add at least one more time to enable multi-slot scheduling</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Evidence Policy Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Evidence / Proof Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Require proof photo</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Staff must attach a photo before completing this task</p>
              </div>
              <Switch checked={evidenceRequired} onCheckedChange={setEvidenceRequired} />
            </div>
            {evidenceRequired && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Also require review</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Manager must approve the proof before task is fully done</p>
                  </div>
                  <Switch checked={reviewRequired} onCheckedChange={setReviewRequired} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instructions for staff</Label>
                  <Textarea
                    placeholder="e.g. Photo must include the thermometer display and location ID sticker"
                    rows={2}
                    value={evidenceInstructions}
                    onChange={(e) => setEvidenceInstructions(e.target.value)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/tasks")}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateTask.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateTask.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TaskEdit;
