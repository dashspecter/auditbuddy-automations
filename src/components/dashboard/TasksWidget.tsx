import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListTodo, Clock, Plus, ArrowRight } from "lucide-react";
import { useTaskStats, useTasks, Task } from "@/hooks/useTasks";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { isTaskOverdue, getTaskDeadline } from "@/lib/taskOccurrenceEngine";
import { useState } from "react";
import { DashboardPreviewDialog } from "./DashboardPreviewDialog";

export const TasksWidget = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useTaskStats();
  const { data: tasks, isLoading: tasksLoading } = useTasks({ status: 'pending' });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const isLoading = statsLoading || tasksLoading;

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "warning";
      default: return "secondary";
    }
  };

  const checkOverdue = (task: Task) => isTaskOverdue(task);

  const urgentTasks = tasks
    ?.sort((a, b) => {
      const aOverdue = checkOverdue(a);
      const bOverdue = checkOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      const aDeadline = getTaskDeadline(a);
      const bDeadline = getTaskDeadline(b);
      if (aDeadline && bDeadline) {
        return aDeadline.getTime() - bDeadline.getTime();
      }
      return 0;
    })
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            Tasks Overview
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/tasks/new")}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <div className="text-xl font-bold">{stats?.pending || 0}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-2 bg-destructive/10 rounded-md">
              <div className="text-xl font-bold text-destructive">{stats?.overdue || 0}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
            <div className="text-center p-2 bg-primary/10 rounded-md">
              <div className="text-xl font-bold text-primary">{stats?.completed || 0}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>

          {urgentTasks && urgentTasks.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Urgent Tasks
              </div>
              {urgentTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-2 rounded-md border cursor-pointer hover:bg-accent/5 transition-colors ${
                    checkOverdue(task) ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                  }`}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.due_at && (
                          <span className={`text-xs flex items-center gap-1 ${
                            checkOverdue(task) ? 'text-destructive' : 'text-muted-foreground'
                          }`}>
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.due_at), "MMM d")}
                          </span>
                        )}
                        {task.assigned_employee?.full_name && (
                          <span className="text-xs text-muted-foreground truncate">
                            {task.assigned_employee.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={priorityColor(task.priority) as any} className="text-xs shrink-0">
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No pending tasks
            </div>
          )}

          <Button
            variant="link"
            className="w-full mt-2 text-xs"
            onClick={() => navigate("/tasks")}
          >
            View All Tasks <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {selectedTask && (
        <DashboardPreviewDialog
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          title={selectedTask.title}
          description="Task details"
          navigateTo="/tasks"
          navigateLabel="Go to Tasks"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">Priority</p>
                <Badge variant={priorityColor(selectedTask.priority) as any} className="mt-1">
                  {selectedTask.priority}
                </Badge>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium mt-1">{selectedTask.status}</p>
              </div>
            </div>
            {selectedTask.due_at && (
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className={`text-sm font-medium mt-1 ${checkOverdue(selectedTask) ? "text-destructive" : ""}`}>
                  {format(new Date(selectedTask.due_at), "PPP")}
                  {checkOverdue(selectedTask) && " (Overdue)"}
                </p>
              </div>
            )}
            {selectedTask.assigned_employee?.full_name && (
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">Assigned To</p>
                <p className="text-sm font-medium mt-1">{selectedTask.assigned_employee.full_name}</p>
              </div>
            )}
            {selectedTask.description && (
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm mt-1">{selectedTask.description}</p>
              </div>
            )}
          </div>
        </DashboardPreviewDialog>
      )}
    </>
  );
};
