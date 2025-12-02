import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { ListTodo, Clock, AlertCircle, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMyTasks, useCompleteTask } from "@/hooks/useTasks";
import { format, isPast, isToday } from "date-fns";

const StaffTasks = () => {
  const { user } = useAuth();
  const { data: tasks, isLoading } = useMyTasks();
  const completeTask = useCompleteTask();

  const toggleTask = (taskId: string, currentStatus: string) => {
    if (currentStatus !== 'completed') {
      completeTask.mutate(taskId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "warning";
      default: return "secondary";
    }
  };

  const pendingTasks = tasks?.filter(t => t.status !== 'completed') || [];
  const completedTasks = tasks?.filter(t => t.status === 'completed') || [];

  const isOverdue = (dueAt: string | null) => {
    if (!dueAt) return false;
    return isPast(new Date(dueAt)) && !isToday(new Date(dueAt));
  };

  const isDueToday = (dueAt: string | null) => {
    if (!dueAt) return false;
    return isToday(new Date(dueAt));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-3">My Tasks</h1>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {pendingTasks.length} pending
            </Badge>
            <Badge variant="outline">
              {completedTasks.length} completed
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              To Do
            </h2>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <Card 
                  key={task.id} 
                  className={`p-4 ${isOverdue(task.due_at) ? 'border-destructive/50 bg-destructive/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={task.status === 'completed'}
                      onCheckedChange={() => toggleTask(task.id, task.status)}
                      className="mt-1"
                      disabled={completeTask.isPending}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium">{task.title}</h3>
                        <Badge variant={priorityColor(task.priority) as any} className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {task.due_at && (
                          <div className={`flex items-center gap-1 ${isOverdue(task.due_at) ? 'text-destructive' : isDueToday(task.due_at) ? 'text-warning' : ''}`}>
                            <Clock className="h-3 w-3" />
                            <span>
                              {isOverdue(task.due_at) ? 'Overdue: ' : isDueToday(task.due_at) ? 'Due today: ' : 'Due: '}
                              {format(new Date(task.due_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                        )}
                        {task.location?.name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{task.location.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 text-muted-foreground">Completed</h2>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <Card key={task.id} className="p-4 opacity-60">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={true}
                      disabled
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium line-through">{task.title}</h3>
                      {task.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed {format(new Date(task.completed_at), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {(!tasks || tasks.length === 0) && (
          <Card className="p-8 text-center">
            <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No tasks assigned</p>
          </Card>
        )}
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffTasks;
