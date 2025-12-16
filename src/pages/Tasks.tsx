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
import { format, isPast, isToday } from "date-fns";
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

const TaskItem = ({ task, onComplete, onEdit, onDelete }: { task: Task; onComplete: () => void; onEdit: () => void; onDelete: () => void }) => {
  // Calculate deadline from start_at + duration_minutes, or fallback to due_at
  const getDeadline = () => {
    if (task.start_at && task.duration_minutes) {
      return new Date(new Date(task.start_at).getTime() + task.duration_minutes * 60000);
    }
    return task.due_at ? new Date(task.due_at) : null;
  };
  
  const deadline = getDeadline();
  const isOverdue = deadline && isPast(deadline) && task.status !== "completed";
  const isDueToday = deadline && isToday(deadline);
  const isRecurring = task.recurrence_type && task.recurrence_type !== "none";

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-lg ${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}`}>
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={() => task.status !== "completed" && onComplete()}
        disabled={task.status === "completed"}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </h4>
            {isRecurring && (
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
            )}
            {task.completed_late && (
              <Badge variant="destructive" className="text-xs">Late</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={priorityColors[task.priority] || priorityColors.medium}>
              {task.priority}
            </Badge>
            <Badge className={statusColors[task.status] || statusColors.pending}>
              {task.status.replace("_", " ")}
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
              {task.assigned_role.name} (shared)
            </span>
          )}
          {task.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {task.location.name}
            </span>
          )}
          {task.start_at && task.duration_minutes && (
            <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}>
              <Timer className="h-3 w-3" />
              {format(new Date(task.start_at), "MMM d, HH:mm")} • {task.duration_minutes}min
            </span>
          )}
          {!task.start_at && task.due_at && (
            <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : isDueToday ? "text-orange-600 font-medium" : ""}`}>
              <Clock className="h-3 w-3" />
              {isOverdue ? "Overdue: " : isDueToday ? "Today: " : "Due: "}
              {format(new Date(task.due_at), "MMM d, HH:mm")}
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

// Employee task card component
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
  const [isOpen, setIsOpen] = useState(false);
  
  const completedTasks = tasks.filter(t => t.status === "completed");
  const pendingTasks = tasks.filter(t => t.status !== "completed");
  const overdueTasks = tasks.filter(t => {
    if (t.status === "completed") return false;
    const deadline = t.start_at && t.duration_minutes 
      ? new Date(new Date(t.start_at).getTime() + t.duration_minutes * 60000)
      : t.due_at ? new Date(t.due_at) : null;
    return deadline && isPast(deadline);
  });
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
                <span>{tasks.length} total tasks</span>
                <span>{completionRate}% complete</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Mobile stats */}
            <div className="sm:hidden grid grid-cols-4 gap-2 py-2 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{completedTasks.length}</div>
                <div className="text-xs text-muted-foreground">Done</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{pendingTasks.length}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-destructive">{overdueTasks.length}</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{completedLateTasks.length}</div>
                <div className="text-xs text-muted-foreground">Late</div>
              </div>
            </div>
            
            {/* Task list */}
            {tasks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No tasks assigned
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
      toast.success("Task completed");
    } catch (error) {
      toast.error("Failed to complete task");
    }
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    try {
      await deleteTask.mutateAsync(deleteTaskId);
      toast.success("Task deleted");
      setDeleteTaskId(null);
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  // Group tasks by employee (completed_by or assigned_to)
  const tasksByEmployee = useMemo(() => {
    const employeeTaskMap: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      // Use completed_by for completed tasks, or assigned_to for pending
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

  // Get employees with tasks (sorted by pending/overdue first)
  const employeesWithTasks = useMemo(() => {
    return employees
      .filter(emp => tasksByEmployee[emp.id]?.length > 0)
      .map(emp => ({
        ...emp,
        tasks: tasksByEmployee[emp.id] || [],
        overdueCount: (tasksByEmployee[emp.id] || []).filter(t => {
          if (t.status === "completed") return false;
          const deadline = t.start_at && t.duration_minutes 
            ? new Date(new Date(t.start_at).getTime() + t.duration_minutes * 60000)
            : t.due_at ? new Date(t.due_at) : null;
          return deadline && isPast(deadline);
        }).length
      }))
      .sort((a, b) => b.overdueCount - a.overdueCount || b.tasks.length - a.tasks.length);
  }, [employees, tasksByEmployee]);

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return task.status === "pending" || task.status === "in_progress";
    if (activeTab === "completed") return task.status === "completed";
    if (activeTab === "overdue") return task.due_at && isPast(new Date(task.due_at)) && task.status !== "completed";
    return true;
  });

  const hasTasks = tasks.length > 0;

  const taskSubItems = [
    { title: "All Tasks", url: "/tasks", icon: ListTodo, description: "View all tasks" },
    { title: "Calendar", url: "/tasks/calendar", icon: Calendar, description: "Calendar view" },
    { title: "New Task", url: "/tasks/new", icon: Plus, description: "Create task" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage daily operations and follow-up actions
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/tasks/calendar")}>
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => navigate("/tasks/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Mobile-first quick navigation to subitems */}
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

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              All Tasks
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
              Pending
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
              Overdue
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
              Completed
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
              Completed Late
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
          title="No Tasks Yet"
          description="Start organizing your work by creating tasks. Tasks can be created manually or generated automatically from audit findings."
          action={{
            label: "Create Task",
            onClick: () => navigate("/tasks/new")
          }}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="by-employee" className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              By Employee
            </TabsTrigger>
          </TabsList>
          
          {/* By Employee View */}
          <TabsContent value="by-employee" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Employee Task Overview</h2>
                  <p className="text-sm text-muted-foreground">
                    {employeesWithTasks.length} employees with tasks
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
                    <p>No tasks assigned to employees yet.</p>
                    <p className="text-sm mt-1">Tasks assigned to roles will appear here when employees complete them.</p>
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
                      onTaskEdit={(id) => navigate(`/tasks/edit/${id}`)}
                      onTaskDelete={(id) => setDeleteTaskId(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Other tabs content */}
          <TabsContent value={activeTab === "by-employee" ? "" : activeTab} className={activeTab === "by-employee" ? "hidden" : "mt-4"}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "all" && "All Tasks"}
                  {activeTab === "pending" && "Pending Tasks"}
                  {activeTab === "overdue" && "Overdue Tasks"}
                  {activeTab === "completed" && "Completed Tasks"}
                </CardTitle>
                <CardDescription>
                  {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
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
                    <p>No tasks in this category.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onComplete={() => handleComplete(task.id)}
                        onEdit={() => navigate(`/tasks/edit/${task.id}`)}
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
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tasks;
