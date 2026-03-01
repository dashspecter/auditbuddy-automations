import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { EvidenceCaptureModal } from "@/components/evidence/EvidenceCaptureModal";
import { useEvidencePolicy } from "@/hooks/useEvidencePackets";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, CheckCircle2, Clock, AlertCircle, MapPin, Calendar, RefreshCw, Timer, AlertTriangle, Users, LayoutDashboard, User, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";
import { useTasks, useTaskStats, useCompleteTask, useDeleteTask, Task } from "@/hooks/useTasks";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { useLocations } from "@/hooks/useLocations";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AllTasksOpsDashboard } from "@/components/tasks/AllTasksOpsDashboard";
import { ByEmployeeTimeline } from "@/components/tasks/ByEmployeeTimeline";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import {
  getTaskDate,
  getTaskDeadline,
  isTaskOverdue,
  isVirtualId as isVirtualTask,
  getOccurrencesHappeningNow,
  isDateInToday,
  getOriginalTaskId,
} from "@/lib/taskOccurrenceEngine";
import { useUnifiedTasks } from "@/hooks/useUnifiedTasks";
import { groupTasksByStatusShiftAware } from "@/lib/unifiedTaskPipeline";

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgent: "bg-destructive text-destructive-foreground",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

// Helper: resolve the display location name based on filter
const getDisplayLocation = (task: Task, filterLocationId?: string) => {
  const names = task.task_location_names || [];
  const ids = task.task_location_ids || [];
  if (!filterLocationId || names.length === 0) {
    return { name: names[0] || task.location?.name, otherCount: Math.max(0, names.length - 1) };
  }
  const idx = ids.indexOf(filterLocationId);
  if (idx >= 0 && names[idx]) {
    return { name: names[idx], otherCount: names.length - 1 };
  }
  return { name: names[0], otherCount: Math.max(0, names.length - 1) };
};

// Simplified TaskListItem for management list (no status badges)
interface TaskListItemProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  filterLocationId?: string;
}

const TaskListItem = ({ task, onEdit, onDelete, filterLocationId }: TaskListItemProps) => {
  const { t } = useTranslation();
  const isRecurring = task.recurrence_type && task.recurrence_type !== "none";

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium">{task.title}</h4>
            {isRecurring && (
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <Badge className={priorityColors[task.priority] || priorityColors.medium}>
            {t(`tasks.priority.${task.priority}`)}
          </Badge>
        </div>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
          {task.assigned_role && (
            <span className="flex items-center gap-1 text-primary">
              <Users className="h-3 w-3" />
              {task.assigned_role.name}
            </span>
          )}
          {(() => {
            const loc = getDisplayLocation(task, filterLocationId);
            return loc.name ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {loc.name}
                {loc.otherCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    +{loc.otherCount}
                  </Badge>
                )}
              </span>
            ) : null;
          })()}
          {task.start_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(task.start_at), "HH:mm")}
            </span>
          )}
          {task.duration_minutes && (
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {task.duration_minutes}min
            </span>
          )}
          {isRecurring && (
            <span className="flex items-center gap-1 text-primary">
              <RefreshCw className="h-3 w-3" />
              {task.recurrence_type}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Enhanced TaskItem with proper Late/Overdue logic that respects context
interface TaskItemProps {
  task: Task;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  context?: 'today' | 'tomorrow' | 'all' | 'pending' | 'overdue' | 'completed';
  filterLocationId?: string;
}

const TaskItem = ({ task, onComplete, onEdit, onDelete, context, filterLocationId }: TaskItemProps) => {
  const { t } = useTranslation();
  
  // Check if this is a virtual recurring instance using canonical utility
  const isVirtualInstance = isVirtualTask(task.id);
  
  // Get task dates using canonical utilities
  const taskDate = getTaskDate(task);
  const deadline = getTaskDeadline(task);
  
  // CRITICAL: Use canonical overdue check
  // A task in 'tomorrow' context can NEVER be overdue (its deadline is in the future)
  const isOverdue = isTaskOverdue(task);
  
  // For display - if context is 'tomorrow', NEVER show as overdue (logical impossibility)
  const showAsOverdue = context === 'tomorrow' ? false : isOverdue;
  
  const isDueToday = deadline && isDateInToday(deadline);
  const isRecurring = task.recurrence_type && task.recurrence_type !== "none";
  
  // Show scheduled badge for virtual instances or future recurring tasks in tomorrow context
  const showScheduledBadge = isVirtualInstance || (context === 'tomorrow' && isRecurring && !isVirtualInstance);

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-lg ${showAsOverdue ? "border-destructive/50 bg-destructive/5" : ""} ${isVirtualInstance ? "border-dashed border-primary/30 bg-primary/5" : ""}`}>
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={() => task.status !== "completed" && !isVirtualInstance && onComplete()}
        disabled={task.status === "completed" || isVirtualInstance}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </h4>
            {isRecurring && (
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
            )}
            {showScheduledBadge && (
              <Badge variant="outline" className="text-xs border-primary/50 text-primary">{t('tasks.scheduledInstance')}</Badge>
            )}
            {/* Only show Late badge for COMPLETED tasks that were completed late, never for pending future tasks */}
            {task.status === "completed" && task.completed_late && (
              <Badge variant="destructive" className="text-xs">{t('tasks.late')}</Badge>
            )}
            {/* Show overdue indicator ONLY for past-due pending tasks that are NOT in tomorrow context */}
            {showAsOverdue && task.status !== "completed" && (
              <Badge variant="destructive" className="text-xs">{t('tasks.overdue')}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={priorityColors[task.priority] || priorityColors.medium}>
              {t(`tasks.priority.${task.priority}`)}
            </Badge>
            <Badge className={statusColors[task.status] || statusColors.pending}>
              {t(`tasks.status.${task.status === 'in_progress' ? 'inProgress' : task.status}`)}
            </Badge>
          </div>
        </div>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
          {task.assigned_employee && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assigned_employee.full_name}
            </span>
          )}
          {task.assigned_role && !task.assigned_employee && (
            <span className="flex items-center gap-1 text-primary">
              <Users className="h-3 w-3" />
              {task.assigned_role.name} {!task.is_individual && `(${t('tasks.shared')})`}
            </span>
          )}
          {(() => {
            const loc = getDisplayLocation(task, filterLocationId);
            return loc.name ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {loc.name}
                {loc.otherCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    +{loc.otherCount}
                  </Badge>
                )}
              </span>
            ) : null;
          })()}
          {task.start_at && task.duration_minutes && (
            <span className={`flex items-center gap-1 ${showAsOverdue ? "text-destructive font-medium" : ""}`}>
              <Timer className="h-3 w-3" />
              {format(new Date(task.start_at), "MMM d, HH:mm")} • {task.duration_minutes}min
            </span>
          )}
          {!task.start_at && task.due_at && (
            <span className={`flex items-center gap-1 ${showAsOverdue ? "text-destructive font-medium" : isDueToday ? "text-orange-600 font-medium" : ""}`}>
              <Clock className="h-3 w-3" />
              {showAsOverdue ? `${t('tasks.overdue')}: ` : isDueToday ? `${t('common.today')}: ` : `${t('common.due')}: `}
              {format(new Date(task.due_at), "MMM d, HH:mm")}
            </span>
          )}
          {isRecurring && !showScheduledBadge && (
            <span className="flex items-center gap-1 text-primary">
              <RefreshCw className="h-3 w-3" />
              {task.recurrence_type}
            </span>
          )}
          {/* Show completion info for completed tasks */}
          {task.status === "completed" && task.completed_at && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {task.completed_employee?.full_name ? `${task.completed_employee.full_name} • ` : ""}
              {format(new Date(task.completed_at), "HH:mm")}
            </span>
          )}
        </div>
      </div>
      {!isVirtualInstance && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

const Tasks = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("list");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");

  // ── Evidence gate state ──
  const [evidenceGateTaskId, setEvidenceGateTaskId] = useState<string | null>(null);
  const evidenceBaseId = evidenceGateTaskId ? getOriginalTaskId(evidenceGateTaskId) : undefined;
  const { data: evidenceGatePolicy = null } = useEvidencePolicy("task_template", evidenceBaseId);

  const { data: locations = [] } = useLocations();
  const { data: roles = [] } = useEmployeeRoles();

  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks();
  const { data: stats } = useTaskStats();
  const { data: employees = [] } = useEmployees();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  // Use UNIFIED pipeline for shift-aware task filtering
  const {
    todayTasks: todayResult,
    tomorrowTasks: tomorrowResult,
    grouped: unifiedGrouped,
    isLoading: isLoadingUnified,
    isLoadingShifts,
    rawTasks,
    shifts,
    debug: unifiedDebug,
  } = useUnifiedTasks({
    viewMode: "planning", // Show all tasks including those without coverage
    startDate: startOfDay(new Date()),
    endDate: endOfDay(addDays(new Date(), 7)),
  });

  // DEV: Log pipeline debug info
  if (import.meta.env.DEV && !isLoadingUnified) {
    console.log("[Tasks.tsx] Pipeline debug:", {
      shiftsCount: shifts?.length || 0,
      todayTasksCount: todayResult?.tasks?.length || 0,
      todayNoCoverage: todayResult?.noCoverage?.length || 0,
      todayCovered: todayResult?.covered?.length || 0,
      tomorrowTasksCount: tomorrowResult?.tasks?.length || 0,
    });
  }

  const isLoading = isLoadingTasks || isLoadingUnified;

  const handleComplete = async (taskId: string, skipEvidenceCheck = false) => {
    // ── Evidence Gate ──
    if (!skipEvidenceCheck) {
      const baseTaskId = getOriginalTaskId(taskId);
      const { data: policy } = await supabase
        .from("evidence_policies")
        .select("*")
        .eq("applies_to", "task_template")
        .eq("applies_id", baseTaskId)
        .eq("evidence_required", true)
        .limit(1)
        .maybeSingle();

      if (policy) {
        const { data: existingPackets } = await supabase
          .from("evidence_packets")
          .select("id, status")
          .eq("subject_type", "task_occurrence")
          .eq("subject_id", taskId)
          .order("created_at", { ascending: false })
          .limit(5);

        const hasValidProof = (existingPackets ?? []).some(
          (p) => p.status === "submitted" || p.status === "approved"
        );

        if (!hasValidProof) {
          setEvidenceGateTaskId(taskId);
          return;
        }
      }
    }

    try {
      await completeTask.mutateAsync(taskId);
      toast.success(t('tasks.taskCompleted'));
    } catch (error) {
      toast.error(t('tasks.failedCompleteTask'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    try {
      await deleteTask.mutateAsync(deleteTaskId);
      toast.success(t('tasks.taskDeleted'));
      setDeleteTaskId(null);
    } catch (error) {
      toast.error(t('tasks.failedDeleteTask'));
    }
  };

  // Helper to filter by location, role, and employee
  const filterTasks = (taskList: Task[]) => {
    return taskList.filter(t => {
      if (selectedLocationId !== "all") {
        // Use junction-table location IDs if available, fallback to location_id
        const taskLocIds = t.task_location_ids;
        if (taskLocIds && taskLocIds.length > 0) {
          if (!taskLocIds.includes(selectedLocationId)) return false;
        } else if (t.location_id !== selectedLocationId) {
          return false;
        }
      }
      if (selectedRoleId !== "all") {
        const matchesPrimary = t.assigned_role_id === selectedRoleId;
        const matchesJunction = (t as any).task_role_ids?.includes(selectedRoleId);
        if (!matchesPrimary && !matchesJunction) return false;
      }
      if (selectedEmployeeId !== "all" && t.assigned_to !== selectedEmployeeId) return false;
      return true;
    });
  };

  // Get SHIFT-AWARE tasks from unified pipeline, filtered by location/role/employee
  const todayTasks = useMemo(() => filterTasks(todayResult.tasks as Task[]), [todayResult.tasks, selectedLocationId, selectedRoleId, selectedEmployeeId]);
  const tomorrowTasks = useMemo(() => filterTasks(tomorrowResult.tasks as Task[]), [tomorrowResult.tasks, selectedLocationId, selectedRoleId, selectedEmployeeId]);
  const locationFilteredTasks = useMemo(() => filterTasks(tasks), [tasks, selectedLocationId, selectedRoleId, selectedEmployeeId]);

  // Build "Happening Now" using base IDs to handle virtual occurrence IDs properly
  // Step 1: Get base IDs of tasks happening right now
  const happeningNowBaseIds = useMemo(() => {
    const happeningNowOccurrences = getOccurrencesHappeningNow(rawTasks);
    return new Set(happeningNowOccurrences.map(t => getOriginalTaskId(t.id)));
  }, [rawTasks]);

  // Step 2: Build tasksHappeningNow from todayTasks (enriched with coverage/timeLock/completion)
  // This ensures we render the SAME objects used elsewhere, avoiding duplication issues
  const tasksHappeningNow = useMemo(() => {
    // Only show pending tasks that are happening now (completed ones shouldn't show in "Happening Now")
    return todayTasks.filter(t => 
      happeningNowBaseIds.has(getOriginalTaskId(t.id)) && 
      t.status !== 'completed'
    );
  }, [todayTasks, happeningNowBaseIds]);

  // Step 3: Build exclusion set from what we actually rendered in "Happening Now"
  const happeningExcludeBaseIds = useMemo(() => {
    return new Set(tasksHappeningNow.map(t => getOriginalTaskId(t.id)));
  }, [tasksHappeningNow]);

  // Group today's tasks by status (shift-aware), then filter ALL groups to exclude "Happening Now"
  const todayGrouped = useMemo(() => {
    const grouped = groupTasksByStatusShiftAware(todayTasks);
    
    // Helper to check if a task should be excluded (already shown in Happening Now)
    const notInHappeningNow = (t: Task) => !happeningExcludeBaseIds.has(getOriginalTaskId(t.id));
    
    // Filter ALL groups to avoid duplication across any section
    return {
      pending: grouped.pending.filter(notInHappeningNow),
      overdue: grouped.overdue.filter(notInHappeningNow),
      noCoverage: grouped.noCoverage.filter(notInHappeningNow),
      completed: grouped.completed.filter(notInHappeningNow),
    };
  }, [todayTasks, happeningExcludeBaseIds]);

  const filteredTasks = useMemo(() => {
    if (activeTab === "all") return locationFilteredTasks;
    if (activeTab === "today") return todayTasks as Task[];
    if (activeTab === "tomorrow") return tomorrowTasks as Task[];
    if (activeTab === "pending") return locationFilteredTasks.filter(task => task.status === "pending" || task.status === "in_progress");
    if (activeTab === "completed") return locationFilteredTasks.filter(task => task.status === "completed");
    // Use canonical overdue check
    if (activeTab === "overdue") return locationFilteredTasks.filter(task => isTaskOverdue(task));
    return locationFilteredTasks;
  }, [activeTab, locationFilteredTasks, todayTasks, tomorrowTasks]);

  const hasActiveFilter = selectedLocationId !== "all" || selectedRoleId !== "all" || selectedEmployeeId !== "all";
  const filteredStats = useMemo(() => {
    if (!hasActiveFilter) return stats;
    const total = locationFilteredTasks.length;
    const pending = locationFilteredTasks.filter(t => t.status === "pending" || t.status === "in_progress").length;
    const overdue = locationFilteredTasks.filter(t => isTaskOverdue(t)).length;
    const completed = locationFilteredTasks.filter(t => t.status === "completed").length;
    const completedLate = locationFilteredTasks.filter(t => t.status === "completed" && t.completed_late).length;
    return { total, pending, overdue, completed, completedLate };
  }, [hasActiveFilter, locationFilteredTasks, stats]);

  const hasTasks = locationFilteredTasks.length > 0;

  const taskSubItems = [
    { title: t('tasks.allTasks'), url: "/tasks", icon: ListTodo, description: t('tasks.allTasks') },
    { title: t('tasks.calendar'), url: "/tasks/calendar", icon: Calendar, description: t('tasks.calendar') },
    { title: t('tasks.newTask'), url: "/tasks/new", icon: Plus, description: t('tasks.createTask') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('tasks.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('tasks.manageDescription')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/tasks/calendar")}>
            <Calendar className="h-4 w-4 mr-2" />
            {t('tasks.calendar')}
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => navigate("/tasks/new")}>
            <Plus className="h-4 w-4 mr-2" />
            {t('tasks.createTask')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:hidden">
        {taskSubItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card 
              key={item.url} 
              className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full"
              onClick={() => navigate(item.url)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">{item.title}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              {t('tasks.allTasks')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : filteredStats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('tasks.pending')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : filteredStats?.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {t('tasks.overdue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{isLoading ? <Skeleton className="h-8 w-12" /> : filteredStats?.overdue || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t('tasks.completed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{isLoading ? <Skeleton className="h-8 w-12" /> : filteredStats?.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('tasks.completedLate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{isLoading ? <Skeleton className="h-8 w-12" /> : filteredStats?.completedLate || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters: Location, Role, Employee */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('common.allLocations', 'All Locations')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allLocations', 'All Locations')}</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('tasks.allRoles', 'All Roles')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.allRoles', 'All Roles')}</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('tasks.allEmployees', 'All Employees')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.allEmployees', 'All Employees')}</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(selectedLocationId !== "all" || selectedRoleId !== "all" || selectedEmployeeId !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => {
            setSelectedLocationId("all");
            setSelectedRoleId("all");
            setSelectedEmployeeId("all");
          }}>
            {t('common.clearFilter', 'Clear')}
          </Button>
        )}
      </div>

      {!hasTasks && !isLoading ? (
        <EmptyState
          icon={ListTodo}
          title={t('tasks.noTasksYet')}
          description={t('tasks.noTasksDescription')}
          action={{
            label: t('tasks.createTask'),
            onClick: () => navigate("/tasks/new")
          }}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="list" className="flex items-center gap-1">
              <ListTodo className="h-3.5 w-3.5" />
              {t('tasks.list', 'List')}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-1">
              <LayoutDashboard className="h-3.5 w-3.5" />
              {t('tasks.opsDashboard')}
            </TabsTrigger>
            <TabsTrigger value="today" className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {t('common.today')} {todayTasks.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{todayTasks.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="tomorrow">
              {t('common.tomorrow')} {tomorrowTasks.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{tomorrowTasks.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pending">{t('tasks.pending')}</TabsTrigger>
            <TabsTrigger value="overdue">{t('tasks.overdue')}</TabsTrigger>
            <TabsTrigger value="completed">{t('tasks.completed')}</TabsTrigger>
            <TabsTrigger value="by-employee" className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {t('tasks.byEmployee')}
            </TabsTrigger>
          </TabsList>
          
          {/* All Tasks List View */}
          <TabsContent value="list" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('tasks.allTasks')}</CardTitle>
                  <CardDescription>
                    {locationFilteredTasks.length} {t('tasks.title').toLowerCase()} • {t('tasks.manageTasksHere', 'Manage all your tasks here')}
                  </CardDescription>
                </div>
                <Button onClick={() => navigate("/tasks/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('tasks.createTask')}
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : locationFilteredTasks.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('tasks.noTasksYet')}</p>
                    <Button className="mt-4" onClick={() => navigate("/tasks/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('tasks.createTask')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {locationFilteredTasks.map((task) => (
                      <TaskListItem
                        key={task.id}
                        task={task}
                        onEdit={() => navigate(`/tasks/${task.id}/edit`)}
                        onDelete={() => setDeleteTaskId(task.id)}
                        filterLocationId={selectedLocationId !== "all" ? selectedLocationId : undefined}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Tasks - Ops Dashboard */}
          <TabsContent value="all" className="mt-4">
            <AllTasksOpsDashboard
              tasks={locationFilteredTasks}
              noCoverageTasks={unifiedGrouped.noCoverage}
              onComplete={handleComplete}
              onEdit={(id) => navigate(`/tasks/${id}/edit`)}
              onDelete={(id) => setDeleteTaskId(id)}
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="by-employee" className="mt-4">
            <ByEmployeeTimeline
              tasks={locationFilteredTasks}
              employees={employees}
              onComplete={handleComplete}
              onEdit={(id) => navigate(`/tasks/${id}/edit`)}
              onDelete={(id) => setDeleteTaskId(id)}
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value={activeTab === "by-employee" || activeTab === "all" || activeTab === "list" ? "" : activeTab} className={activeTab === "by-employee" || activeTab === "all" || activeTab === "list" ? "hidden" : "mt-4"}>
            {/* Happening Now Alert for Today tab */}
            {activeTab === "today" && tasksHappeningNow.length > 0 && (
              <Card className="mb-4 border-primary bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                    {t('tasks.happeningNow', 'Happening Now')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasksHappeningNow.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      context="today"
                      onComplete={() => handleComplete(task.id)}
                      onEdit={() => navigate(`/tasks/${task.id}/edit`)}
                      onDelete={() => setDeleteTaskId(task.id)}
                      filterLocationId={selectedLocationId !== "all" ? selectedLocationId : undefined}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "today" && t('tasks.todaysTasks', "Today's Tasks")}
                  {activeTab === "tomorrow" && t('tasks.tomorrowsTasks', "Tomorrow's Tasks")}
                  {activeTab === "pending" && t('tasks.pendingTasks')}
                  {activeTab === "overdue" && t('tasks.overdueTasks')}
                  {activeTab === "completed" && t('tasks.completedTasks')}
                </CardTitle>
                <CardDescription>
                  {filteredTasks.length} {filteredTasks.length === 1 ? t('tasks.title').toLowerCase() : t('tasks.title').toLowerCase()}
                  {activeTab === "today" && tasksHappeningNow.length > 0 && (
                    <span className="ml-2 text-primary font-medium">
                      • {tasksHappeningNow.length} {t('tasks.inProgress', 'in progress')}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {activeTab === "today" && t('tasks.noTasksScheduledToday')}
                      {activeTab === "tomorrow" && t('tasks.noTasksScheduledTomorrow')}
                      {activeTab !== "today" && activeTab !== "tomorrow" && t('tasks.noTasksInCategory')}
                    </p>
                  </div>
                ) : activeTab === "today" ? (
                  // Today tab with grouped sections
                  <div className="space-y-6">
                    {/* Overdue Section */}
                    {todayGrouped.overdue.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <h3 className="font-semibold text-destructive">{t('tasks.overdue')}</h3>
                          <Badge variant="destructive" className="text-xs">{todayGrouped.overdue.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {todayGrouped.overdue.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              context="today"
                              onComplete={() => handleComplete(task.id)}
                              onEdit={() => navigate(`/tasks/${task.id}/edit`)}
                              onDelete={() => setDeleteTaskId(task.id)}
                              filterLocationId={selectedLocationId !== "all" ? selectedLocationId : undefined}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* No Coverage Section (Planning mode - shows tasks without shift coverage) */}
                    {todayGrouped.noCoverage.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <h3 className="font-semibold text-amber-600">{t('common.noCoverage', 'No Coverage')}</h3>
                          <Badge className="bg-amber-100 text-amber-800 text-xs">{todayGrouped.noCoverage.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {todayGrouped.noCoverage.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              context="today"
                              onComplete={() => handleComplete(task.id)}
                              onEdit={() => navigate(`/tasks/${task.id}/edit`)}
                              onDelete={() => setDeleteTaskId(task.id)}
                              filterLocationId={selectedLocationId !== "all" ? selectedLocationId : undefined}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Pending Section */}
                    {todayGrouped.pending.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <h3 className="font-semibold">{t('tasks.pending')}</h3>
                          <Badge variant="secondary" className="text-xs">{todayGrouped.pending.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {todayGrouped.pending.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              context="today"
                              onComplete={() => handleComplete(task.id)}
                              onEdit={() => navigate(`/tasks/${task.id}/edit`)}
                              onDelete={() => setDeleteTaskId(task.id)}
                              filterLocationId={selectedLocationId !== "all" ? selectedLocationId : undefined}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Completed Section */}
                    {todayGrouped.completed.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <h3 className="font-semibold text-green-600">{t('tasks.completed')}</h3>
                          <Badge className="bg-green-100 text-green-800 text-xs">{todayGrouped.completed.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {todayGrouped.completed.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              context="today"
                              onComplete={() => handleComplete(task.id)}
                              onEdit={() => navigate(`/tasks/${task.id}/edit`)}
                              onDelete={() => setDeleteTaskId(task.id)}
                              filterLocationId={selectedLocationId !== "all" ? selectedLocationId : undefined}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        context={activeTab as 'today' | 'tomorrow' | 'all' | 'pending' | 'overdue' | 'completed'}
                        onComplete={() => handleComplete(task.id)}
                        onEdit={() => navigate(`/tasks/${task.id}/edit`)}
                        onDelete={() => setDeleteTaskId(task.id)}
                        filterLocationId={selectedLocationId !== "all" ? selectedLocationId : undefined}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tasks.deleteTask')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tasks.deleteTaskConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Evidence capture modal — shown when task requires photo proof */}
      {evidenceGateTaskId && (
        <EvidenceCaptureModal
          open
          subjectType="task_occurrence"
          subjectId={evidenceGateTaskId}
          policy={evidenceGatePolicy}
          title="Proof required"
          onComplete={async (_packetId) => {
            const taskId = evidenceGateTaskId;
            setEvidenceGateTaskId(null);
            await handleComplete(taskId, true);
          }}
          onCancel={() => {
            setEvidenceGateTaskId(null);
            toast.info("Task not completed — proof is required.");
          }}
        />
      )}
    </div>
  );
};

export default Tasks;
