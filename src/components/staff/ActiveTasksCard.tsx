import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Timer, MapPin, ArrowRight, AlertTriangle } from "lucide-react";
import { useMyTasks, useCompleteTask, Task } from "@/hooks/useTasks";
import { differenceInSeconds } from "date-fns";
import { getTaskDate, getTaskDeadline } from "@/lib/taskDateUtils";

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
      <div className="flex items-center gap-1.5 text-destructive font-semibold animate-pulse">
        <AlertTriangle className="h-4 w-4" />
        <span>Overdue!</span>
      </div>
    );
  }

  const isUrgent = timeLeft < 300; // Less than 5 minutes
  const isWarning = timeLeft < 900; // Less than 15 minutes

  return (
    <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${
      isUrgent ? 'text-destructive animate-pulse' : 
      isWarning ? 'text-orange-500' : 
      'text-primary'
    }`}>
      <Timer className="h-4 w-4" />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
};

export const ActiveTasksCard = () => {
  const navigate = useNavigate();
  const { data: tasks = [] } = useMyTasks();
  const completeTask = useCompleteTask();

  // Check if task has started (is now active)
  const isTaskActive = (task: Task) => {
    if (!task.start_at) return true;
    return new Date(task.start_at) <= new Date();
  };

  // Get only active, non-completed tasks
  const activeTasks = tasks
    .filter(t => t.status !== 'completed' && isTaskActive(t))
    .slice(0, 3); // Show max 3 tasks

  if (activeTasks.length === 0) {
    return null;
  }

  const handleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    completeTask.mutate(taskId);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          <h2 className="font-semibold">Active Tasks</h2>
          <Badge variant="destructive" className="text-xs">
            {activeTasks.length}
          </Badge>
        </div>
        <Button variant="link" size="sm" className="text-primary" onClick={() => navigate("/staff/tasks")}>
          View All <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
      
      <div className="space-y-2">
        {activeTasks.map((task) => (
          <Card 
            key={task.id} 
            className="p-4 border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent cursor-pointer hover:bg-accent/10 transition-colors"
            onClick={() => navigate("/staff/tasks")}
          >
            <div className="flex items-start gap-3">
              <Checkbox 
                checked={false}
                onCheckedChange={() => {}}
                onClick={(e) => handleComplete(task.id, e as any)}
                className="mt-0.5"
                disabled={completeTask.isPending}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-medium truncate">{task.title}</h3>
                  <Badge 
                    variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'secondary' : 'outline'} 
                    className="text-xs shrink-0"
                  >
                    {task.priority}
                  </Badge>
                </div>
                
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{task.description}</p>
                )}
                
                <div className="flex items-center justify-between gap-2">
                  {task.start_at && task.duration_minutes ? (
                    <CountdownTimer 
                      startAt={task.start_at} 
                      durationMinutes={task.duration_minutes} 
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">No deadline</span>
                  )}
                  
                  {task.location?.name && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-20">{task.location.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
