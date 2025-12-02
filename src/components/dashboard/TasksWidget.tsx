import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListTodo, Clock, AlertCircle, Plus, ArrowRight } from "lucide-react";
import { useTaskStats, useTasks } from "@/hooks/useTasks";
import { useNavigate } from "react-router-dom";
import { format, isPast, isToday } from "date-fns";

export const TasksWidget = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useTaskStats();
  const { data: tasks, isLoading: tasksLoading } = useTasks({ status: 'pending' });

  const isLoading = statsLoading || tasksLoading;

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "warning";
      default: return "secondary";
    }
  };

  const isOverdue = (dueAt: string | null) => {
    if (!dueAt) return false;
    return isPast(new Date(dueAt)) && !isToday(new Date(dueAt));
  };

  // Get the most urgent tasks (overdue first, then by due date)
  const urgentTasks = tasks
    ?.sort((a, b) => {
      const aOverdue = a.due_at && isOverdue(a.due_at);
      const bOverdue = b.due_at && isOverdue(b.due_at);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (a.due_at && b.due_at) {
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
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
        {/* Stats Row */}
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

        {/* Urgent Tasks */}
        {urgentTasks && urgentTasks.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Urgent Tasks
            </div>
            {urgentTasks.map((task) => (
              <div 
                key={task.id} 
                className={`p-2 rounded-md border cursor-pointer hover:bg-accent/5 transition-colors ${
                  isOverdue(task.due_at) ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                }`}
                onClick={() => navigate("/tasks")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.due_at && (
                        <span className={`text-xs flex items-center gap-1 ${
                          isOverdue(task.due_at) ? 'text-destructive' : 'text-muted-foreground'
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

        {/* View All Link */}
        <Button 
          variant="link" 
          className="w-full mt-2 text-xs" 
          onClick={() => navigate("/tasks")}
        >
          View All Tasks <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};
