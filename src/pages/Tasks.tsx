import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, CheckCircle2, Clock, AlertCircle, User, MapPin, Trash2, Calendar, RefreshCw, Timer, AlertTriangle, Users, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";
import { useTasks, useTaskStats, useCompleteTask, useDeleteTask, Task } from "@/hooks/useTasks";
import { useEmployees } from "@/hooks/useEmployees";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import {
  getTaskDate,
  getTaskDeadline,
  isTaskOverdue,
  isVirtualTask,
  getTodayTasks,
  getTomorrowTasks,
  getTasksHappeningNow,
  isDateToday,
} from "@/lib/taskDateUtils";

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

// Enhanced TaskItem with proper Late/Overdue logic that respects context
interface TaskItemProps {
  task: Task;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  context?: 'today' | 'tomorrow' | 'all' | 'pending' | 'overdue' | 'completed';
}

const TaskItem = ({ task, onComplete, onEdit, onDelete, context }: TaskItemProps) => {
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
  
  const isDueToday = deadline && isDateToday(deadline);
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
          {task.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {task.location.name}
            </span>
          )}
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

const EmployeeTaskCard = ({ 
  employee, 
  tasks,
  onTaskComplete,
  onTaskEdit,
  onTaskDelete 
}: { 
  employee: { id: string; full_name: string; avatar_url?: string | null; role: string };
  tasks: Task[];
  onTaskComplete: (taskId: string) => void;
  onTaskEdit: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const completedTasks = tasks.filter(t => t.status === "completed");
  const pendingTasks = tasks.filter(t => t.status !== "completed");
  // Use canonical overdue check
  const overdueTasks = tasks.filter(t => isTaskOverdue(t));
  const completedLateTasks = tasks.filter(t => t.completed_late);
  
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={overdueTasks.length > 0 ? "border-destructive/50" : ""}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback>{employee.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{employee.full_name}</CardTitle>
                  <CardDescription>{employee.role}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{completedTasks.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">{pendingTasks.length}</span>
                  </div>
                  {overdueTasks.length > 0 && (
                    <div className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">{overdueTasks.length}</span>
                    </div>
                  )}
                  {completedLateTasks.length > 0 && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{completedLateTasks.length}</span>
                    </div>
                  )}
                </div>
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{tasks.length} {t('tasks.title').toLowerCase()}</span>
                <span>{completionRate}% {t('tasks.completed').toLowerCase()}</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            <div className="sm:hidden grid grid-cols-4 gap-2 py-2 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{completedTasks.length}</div>
                <div className="text-xs text-muted-foreground">{t('tasks.done')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{pendingTasks.length}</div>
                <div className="text-xs text-muted-foreground">{t('tasks.pending')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-destructive">{overdueTasks.length}</div>
                <div className="text-xs text-muted-foreground">{t('tasks.overdue')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{completedLateTasks.length}</div>
                <div className="text-xs text-muted-foreground">{t('tasks.late')}</div>
              </div>
            </div>
            
            {tasks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {t('tasks.noTasksAssigned')}
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={() => onTaskComplete(task.id)}
                    onEdit={() => onTaskEdit(task.id)}
                    onDelete={() => onTaskDelete(task.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const Tasks = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useTasks();
  const { data: stats } = useTaskStats();
  const { data: employees = [] } = useEmployees();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  const handleComplete = async (taskId: string) => {
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

  const tasksByEmployee = useMemo(() => {
    const employeeTaskMap: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      const employeeId = task.completed_by || task.assigned_to;
      if (employeeId) {
        if (!employeeTaskMap[employeeId]) {
          employeeTaskMap[employeeId] = [];
        }
        employeeTaskMap[employeeId].push(task);
      }
    });
    
    return employeeTaskMap;
  }, [tasks]);

  const employeesWithTasks = useMemo(() => {
    return employees
      .filter(emp => tasksByEmployee[emp.id]?.length > 0)
      .map(emp => ({
        ...emp,
        tasks: tasksByEmployee[emp.id] || [],
        // Use canonical overdue check
        overdueCount: (tasksByEmployee[emp.id] || []).filter(t => isTaskOverdue(t)).length
      }))
      .sort((a, b) => b.overdueCount - a.overdueCount || b.tasks.length - a.tasks.length);
  }, [employees, tasksByEmployee]);

  // All task date utilities are now imported from @/lib/taskDateUtils for consistency

  // Get tasks for today using canonical utility
  const todayTasks = useMemo(() => getTodayTasks(tasks), [tasks]);

  // Get tasks for tomorrow using canonical utility
  const tomorrowTasks = useMemo(() => getTomorrowTasks(tasks), [tasks]);

  // Tasks happening right now using canonical utility
  const tasksHappeningNow = useMemo(() => getTasksHappeningNow(tasks), [tasks]);

  // Group today's tasks by status for better display
  const todayGrouped = useMemo(() => {
    const pending = todayTasks.filter(t => t.status !== 'completed' && !isTaskOverdue(t));
    const overdue = todayTasks.filter(t => isTaskOverdue(t));
    const completed = todayTasks.filter(t => t.status === 'completed');
    return { pending, overdue, completed };
  }, [todayTasks]);

  const filteredTasks = useMemo(() => {
    if (activeTab === "all") return tasks;
    if (activeTab === "today") return todayTasks;
    if (activeTab === "tomorrow") return tomorrowTasks;
    if (activeTab === "pending") return tasks.filter(task => task.status === "pending" || task.status === "in_progress");
    if (activeTab === "completed") return tasks.filter(task => task.status === "completed");
    // Use canonical overdue check
    if (activeTab === "overdue") return tasks.filter(task => isTaskOverdue(task));
    return tasks;
  }, [activeTab, tasks, todayTasks, tomorrowTasks]);

  const hasTasks = tasks.length > 0;

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
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : stats?.total || 0}</div>
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
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : stats?.pending || 0}</div>
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
            <div className="text-2xl font-bold text-destructive">{isLoading ? <Skeleton className="h-8 w-12" /> : stats?.overdue || 0}</div>
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
            <div className="text-2xl font-bold text-green-600">{isLoading ? <Skeleton className="h-8 w-12" /> : stats?.completed || 0}</div>
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
            <div className="text-2xl font-bold text-orange-600">{isLoading ? <Skeleton className="h-8 w-12" /> : stats?.completedLate || 0}</div>
          </CardContent>
        </Card>
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
            <TabsTrigger value="all">{t('tasks.allTasks')}</TabsTrigger>
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
          
          <TabsContent value="by-employee" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{t('tasks.employeeOverview')}</h2>
                  <p className="text-sm text-muted-foreground">
                    {employeesWithTasks.length} {t('workforce.employees.label').toLowerCase()}
                  </p>
                </div>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : employeesWithTasks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('tasks.noTasksAssignedEmployees')}</p>
                    <p className="text-sm mt-1">{t('tasks.tasksAssignedRolesWillAppear')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {employeesWithTasks.map((emp) => (
                    <EmployeeTaskCard
                      key={emp.id}
                      employee={emp}
                      tasks={emp.tasks}
                      onTaskComplete={handleComplete}
                      onTaskEdit={(id) => navigate(`/tasks/${id}/edit`)}
                      onTaskDelete={(id) => setDeleteTaskId(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value={activeTab === "by-employee" ? "" : activeTab} className={activeTab === "by-employee" ? "hidden" : "mt-4"}>
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
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "all" && t('tasks.allTasks')}
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
    </div>
  );
};

export default Tasks;
