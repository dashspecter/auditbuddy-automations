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
import { Switch } from "@/components/ui/switch";

import { ArrowLeft, Save, RefreshCw, Calendar, Users, User, Info, Clock, MapPin, Flag, Share2, UserCheck, Camera, Plus, X as XIcon } from "lucide-react";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { useCreateTask } from "@/hooks/useTasks";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { LocationMultiSelector } from "@/components/LocationMultiSelector";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";

const TaskNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { modules } = useCompanyContext();
  const isWhatsAppActive = modules?.some(
    (m: any) => m.module_name === "whatsapp_messaging" && m.is_active
  );
  const createTask = useCreateTask();
  const { data: employees = [] } = useEmployees();
  const { data: roles = [] } = useEmployeeRoles();
  const [assignmentType, setAssignmentType] = useState<'employee' | 'role'>('role');
  const [isIndividual, setIsIndividual] = useState(false);
  const [recurrenceTimes, setRecurrenceTimes] = useState<string[]>([]);
  const [newTimeInput, setNewTimeInput] = useState("");

  // Evidence policy state
  const [evidenceRequired, setEvidenceRequired] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [evidenceInstructions, setEvidenceInstructions] = useState("");
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    try {
      const task = await createTask.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : undefined,
        duration_minutes: formData.duration_minutes,
        assigned_to: assignmentType === 'employee' && formData.assigned_to ? formData.assigned_to : undefined,
        assigned_role_ids: assignmentType === 'role' && formData.assigned_role_ids.length > 0 ? formData.assigned_role_ids : undefined,
        location_ids: formData.location_ids.length > 0 ? formData.location_ids : undefined,
        source: "manual",
        is_individual: assignmentType === 'role' ? isIndividual : false,
        notify_whatsapp: isWhatsAppActive ? notifyWhatsApp : false,
        recurrence_type: formData.recurrence_type !== "none" ? formData.recurrence_type : undefined,
        recurrence_interval: formData.recurrence_type !== "none" ? formData.recurrence_interval : undefined,
        recurrence_end_date: formData.recurrence_type !== "none" && formData.recurrence_end_date
          ? new Date(formData.recurrence_end_date).toISOString()
          : undefined,
        recurrence_days_of_week: formData.recurrence_type === "weekly" && formData.recurrence_days_of_week.length > 0
          ? formData.recurrence_days_of_week
          : undefined,
        recurrence_days_of_month: formData.recurrence_type === "monthly" && formData.recurrence_days_of_month.length > 0
          ? formData.recurrence_days_of_month
          : undefined,
        recurrence_times: recurrenceTimes.length >= 1 ? recurrenceTimes.sort() : undefined,
      });

      // Save evidence policy if required
      if (evidenceRequired && task?.id && user?.id) {
        const { data: cu } = await supabase
          .from("company_users")
          .select("company_id")
          .eq("user_id", user.id)
          .single();
        if (cu?.company_id) {
          await supabase.from("evidence_policies").upsert({
            company_id: cu.company_id,
            applies_to: "task_template",
            applies_id: task.id,
            evidence_required: true,
            review_required: reviewRequired,
            required_media_types: ["photo"],
            min_media_count: 1,
            instructions: evidenceInstructions.trim() || null,
          }, { onConflict: "company_id,applies_to,applies_id" });
        }
      }

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

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Basic Info */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-3">
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
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
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
                placeholder="Enter task description (optional)"
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scheduling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
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

              <div className="space-y-2">
                <Label htmlFor="duration">Time Limit</Label>
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
                <p className="text-xs text-muted-foreground">Countdown timer will show</p>
              </div>
            </div>

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
              {recurrenceTimes.length >= 1 && (
                <p className="text-xs text-primary font-medium">✓ {recurrenceTimes.length} additional time slot{recurrenceTimes.length > 1 ? 's' : ''} — each will appear as a separate task occurrence per day</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 md:gap-8">
              <div className="space-y-3 md:pr-6 md:border-r md:border-border">
                <Label className="text-sm font-medium">Assign To</Label>
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant={assignmentType === 'employee' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setAssignmentType('employee');
                            setFormData(prev => ({ ...prev, assigned_role_ids: [] }));
                          }}
                          className="flex-1"
                        >
                          <User className="h-4 w-4 mr-1" />
                          Employee
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground">
                        <p className="text-sm">Assigned to a specific person</p>
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
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground">
                        <p className="text-sm">All employees with this role can complete</p>
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
                  <div className="space-y-2">
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
                      {roles.filter(role => role.id && !formData.assigned_role_ids.includes(role.id)).map((role) => (
                        <Button
                          key={role.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="justify-start text-sm h-8"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            assigned_role_ids: [...prev.assigned_role_ids, role.id]
                          }))}
                        >
                          + {role.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Shared vs Individual toggle - only show when role is selected */}
                {assignmentType === 'role' && formData.assigned_role_ids.length > 0 && (
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
                        ? "Each employee with the selected role(s) will need to complete this task individually"
                        : "The task is shared - any employee can complete it for everyone"
                      }
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Locations
                </Label>
                <LocationMultiSelector
                  value={formData.location_ids}
                  onValueChange={(ids) =>
                    setFormData((prev) => ({ ...prev, location_ids: ids }))
                  }
                  placeholder="Select locations"
                />
                <p className="text-xs text-muted-foreground">
                  Task will appear at all selected locations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recurrence Settings */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Recurrence
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
                    <Label>End Date</Label>
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
                        setFormData(prev => ({ ...prev, recurrence_days_of_week: days }));
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
                        setFormData(prev => ({ ...prev, recurrence_days_of_month: days }));
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

        {/* Evidence Policy Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" />
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

        {/* WhatsApp Notification Toggle - only when module is active */}
        {isWhatsAppActive && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-green-500/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>
                  </div>
                  <div>
                    <Label className="font-medium">Notify via WhatsApp</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Send assignment, reminder &amp; overdue alerts to assigned employees
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Tip: Use selectively for critical tasks (start/mid/end of shift) to avoid notification fatigue and daily message limits.
                    </p>
                  </div>
                </div>
                <Switch checked={notifyWhatsApp} onCheckedChange={setNotifyWhatsApp} />
              </div>
            </CardContent>
          </Card>
        )}

        <StickyActionBar className="justify-between sm:justify-end flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/tasks/calendar")}
            className="hidden sm:flex"
          >
            <Calendar className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/tasks")}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending} className="flex-1 sm:flex-none">
              <Save className="h-4 w-4 mr-2" />
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </StickyActionBar>
      </form>
    </div>
  );
};

export default TaskNew;

