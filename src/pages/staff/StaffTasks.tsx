import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { ListTodo, Clock, AlertCircle, MapPin, Timer, ChevronDown, ChevronUp, Calendar, Users, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMyTasks, useCompleteTask, Task } from "@/hooks/useTasks";
import { format, isPast, isToday, differenceInSeconds } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Countdown timer component
const CountdownTimer = ({ startAt, durationMinutes }: { startAt: string; durationMinutes: number }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const start = new Date(startAt);
      const deadline = new Date(start.getTime() + durationMinutes * 60000);
      const now = new Date();
      const remaining = differenceInSeconds(deadline, now);
      
      if (remaining <= 0) {
        setIsExpired(true);
        setTimeLeft(0);
      } else {
        setIsExpired(false);
        setTimeLeft(remaining);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [startAt, durationMinutes]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (isExpired) {
    return (
      <Badge variant="destructive" className="text-xs animate-pulse">
        <Timer className="h-3 w-3 mr-1" />
        Time expired!
      </Badge>
    );
  }

  const isUrgent = timeLeft < 300; // Less than 5 minutes
  const isWarning = timeLeft < 900; // Less than 15 minutes

  return (
    <Badge 
      variant={isUrgent ? "destructive" : "secondary"} 
      className={`text-xs ${isUrgent ? 'animate-pulse' : isWarning ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : ''}`}
    >
      <Timer className="h-3 w-3 mr-1" />
      {formatTime(timeLeft)} left
    </Badge>
  );
};

const StaffTasks = () => {
  const { user } = useAuth();
  const { data: tasks, isLoading } = useMyTasks();
  const completeTask = useCompleteTask();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const toggleTask = (taskId: string, currentStatus: string) => {
    if (currentStatus !== 'completed') {
      completeTask.mutate(taskId);
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
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

  // Check if task has started (is now active)
  const isTaskActive = (task: Task) => {
    if (!task.start_at) return true; // No start time means always active
    return new Date(task.start_at) <= new Date();
  };

  // Filter to only show active tasks
  const activePendingTasks = pendingTasks.filter(isTaskActive);
  const upcomingTasks = pendingTasks.filter(t => !isTaskActive(t));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-3">My Tasks</h1>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {activePendingTasks.length} active
            </Badge>
            {upcomingTasks.length > 0 && (
              <Badge variant="outline">
                {upcomingTasks.length} upcoming
              </Badge>
            )}
            <Badge variant="outline">
              {completedTasks.length} completed
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Active Tasks */}
        {activePendingTasks.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              To Do Now
            </h2>
            <div className="space-y-2">
              {activePendingTasks.map((task) => {
                const isExpanded = expandedTaskId === task.id;
                const isRecurring = task.recurrence_type && task.recurrence_type !== "none";
                
                return (
                  <Card 
                    key={task.id} 
                    className="overflow-hidden"
                  >
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpand(task.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          checked={task.status === 'completed'}
                          onCheckedChange={() => toggleTask(task.id, task.status)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                          disabled={completeTask.isPending}
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{task.title}</h3>
                              {isRecurring && (
                                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={priorityColor(task.priority) as any} className="text-xs">
                                {task.priority}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          {task.description && !isExpanded && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {task.start_at && task.duration_minutes && (
                              <CountdownTimer 
                                startAt={task.start_at} 
                                durationMinutes={task.duration_minutes} 
                              />
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
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                        <div className="pt-3 space-y-3">
                          {task.description && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                              <p className="text-sm">{task.description}</p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {task.start_at && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Start Time
                                </p>
                                <p>{format(new Date(task.start_at), "MMM d, h:mm a")}</p>
                              </div>
                            )}
                            
                            {task.duration_minutes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Timer className="h-3 w-3" />
                                  Duration
                                </p>
                                <p>{task.duration_minutes} minutes</p>
                              </div>
                            )}
                            
                            {task.location?.name && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Location
                                </p>
                                <p>{task.location.name}</p>
                              </div>
                            )}
                            
                            {task.assigned_role?.name && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  Assigned Role
                                </p>
                                <p>{task.assigned_role.name}</p>
                              </div>
                            )}
                          </div>
                          
                          {isRecurring && (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                Recurrence
                              </p>
                              <p className="text-sm text-primary">
                                Repeats {task.recurrence_type}
                                {task.recurrence_interval && task.recurrence_interval > 1
                                  ? ` every ${task.recurrence_interval} ${
                                      task.recurrence_type === "daily" ? "days" :
                                      task.recurrence_type === "weekly" ? "weeks" : "months"
                                    }`
                                  : ""}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Coming Up
            </h2>
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <Card key={task.id} className="p-4 opacity-70 border-dashed">
                  <div className="flex items-start gap-3">
                    <Checkbox disabled className="mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium">{task.title}</h3>
                      {task.start_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Starts: {format(new Date(task.start_at), "h:mm a")}
                          {task.duration_minutes && ` • ${task.duration_minutes} min to complete`}
                        </p>
                      )}
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
              {completedTasks.map((task) => {
                const isExpanded = expandedTaskId === task.id;
                const isRecurring = task.recurrence_type && task.recurrence_type !== "none";
                
                return (
                  <Card 
                    key={task.id} 
                    className="overflow-hidden opacity-70"
                  >
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpand(task.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          checked={true}
                          disabled
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium line-through">{task.title}</h3>
                              {task.completed_late && (
                                <Badge variant="destructive" className="text-xs">Late</Badge>
                              )}
                              {isRecurring && (
                                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          {task.completed_at && (
                            <p className="text-xs text-muted-foreground">
                              Completed {format(new Date(task.completed_at), "MMM d, h:mm a")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                        <div className="pt-3 space-y-3">
                          {task.description && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                              <p className="text-sm">{task.description}</p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {task.start_at && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Started
                                </p>
                                <p>{format(new Date(task.start_at), "MMM d, h:mm a")}</p>
                              </div>
                            )}
                            
                            {task.duration_minutes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Timer className="h-3 w-3" />
                                  Duration
                                </p>
                                <p>{task.duration_minutes} minutes</p>
                              </div>
                            )}
                            
                            {task.location?.name && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Location
                                </p>
                                <p>{task.location.name}</p>
                              </div>
                            )}
                            
                            {task.assigned_role?.name && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  Assigned Role
                                </p>
                                <p>{task.assigned_role.name}</p>
                              </div>
                            )}
                          </div>
                          
                          {isRecurring && (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                Recurrence
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Repeats {task.recurrence_type}
                                {task.recurrence_interval && task.recurrence_interval > 1
                                  ? ` every ${task.recurrence_interval} ${
                                      task.recurrence_type === "daily" ? "days" :
                                      task.recurrence_type === "weekly" ? "weeks" : "months"
                                    }`
                                  : ""}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
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