import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, CheckCircle2, Clock, AlertCircle, User, MapPin, Trash2, Calendar, RefreshCw, Timer, AlertTriangle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";
import { useTasks, useTaskStats, useCompleteTask, useDeleteTask, Task } from "@/hooks/useTasks";
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

const TaskItem = ({ task, onComplete, onDelete }: { task: Task; onComplete: () => void; onDelete: () => void }) => {
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
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

const Tasks = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useTasks();
  const { data: stats } = useTaskStats();
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

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return task.status === "pending" || task.status === "in_progress";
    if (activeTab === "completed") return task.status === "completed";
    if (activeTab === "overdue") return task.due_at && isPast(new Date(task.due_at)) && task.status !== "completed";
    return true;
  });

  const hasTasks = tasks.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage daily operations and follow-up actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/tasks/calendar")}>
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button onClick={() => navigate("/tasks/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
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
          <TabsList>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-4">
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
