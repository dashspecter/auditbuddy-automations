import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, MapPin, ArrowRight, AlertTriangle } from "lucide-react";
import { useCompleteTask } from "@/hooks/useTasks";
import { useMyTaskOccurrences } from "@/hooks/useMyTaskOccurrences";
import { differenceInSeconds } from "date-fns";
import { MobileTapDebugOverlay, useTapDebug, useNetworkStatus } from "./MobileTapDebugOverlay";
import { MobileTaskCard } from "./MobileTaskCard";
import { toast } from "sonner";

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
  const { activeTasks: allActiveTasks } = useMyTaskOccurrences();
  const completeTask = useCompleteTask();
  const { lastTap, logTap } = useTapDebug();
  const isOnline = useNetworkStatus();

  // Optimistic completion state with pending confirmation lock
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState<Set<string>>(() => new Set());
  // Tracks tasks currently waiting for server confirmation: Map<resolvedId, startTimestamp>
  const [pendingCompletionIds, setPendingCompletionIds] = useState<Map<string, number>>(() => new Map());

  const resolveId = useMemo(() => {
    return (id: string) => {
      const match = id.match(
        /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
      );
      return match ? match[1] : id;
    };
  }, []);

  const summarizeError = (err: unknown) => {
    const anyErr = err as any;
    const msg = anyErr?.message ? String(anyErr.message) : "Unknown error";
    const status = anyErr?.status ? ` ${String(anyErr.status)}` : "";
    const code = anyErr?.code ? ` ${String(anyErr.code)}` : "";
    return `${msg}${status}${code}`.trim();
  };

  // Check if a task is server-confirmed as completed
  const isServerChecked = (task: any): boolean => {
    return task.status === "completed" || !!task.completed_at || task.is_completed === true;
  };

  const handleComplete = async (task: any) => {
    // Network check before attempting mutation
    if (!isOnline) {
      logTap(`[offline blocked] task.id=${task.id}`);
      toast.error("No internet. Can't complete right now.");
      return;
    }

    const completionId = (task as any).task_occurrence_id ?? (task as any).occurrence_id ?? (task as any).task_id ?? task.id;
    const resolved = resolveId(String(completionId));
    
    // Prevent duplicate submissions while pending
    if (pendingCompletionIds.has(resolved)) {
      logTap(`[MUTATE blocked - already pending] resolved=${resolved}`);
      return;
    }

    logTap(
      `[MUTATE] task.id=${task.id} completionId=${String(completionId)} resolved=${resolved} status=${task.status} completed_at=${task.completed_at ? "1" : "0"}`,
    );

    const startedAt = Date.now();

    // Immediately set optimistic checked ON and add to pending
    setOptimisticCompletedIds((prev) => {
      const next = new Set(prev);
      next.add(resolved);
      return next;
    });
    setPendingCompletionIds((prev) => {
      const next = new Map(prev);
      next.set(resolved, startedAt);
      return next;
    });

    try {
      const updated = await completeTask.mutateAsync(String(completionId));
      logTap(
        `[MUTATE RESULT] resolved=${resolved} status=${(updated as any)?.status ?? "?"} completed_at=${(updated as any)?.completed_at ? "1" : "0"}`,
      );

      // Check if server confirmed completion
      const serverConfirmed = (updated as any)?.status === "completed" || !!(updated as any)?.completed_at;
      
      if (serverConfirmed) {
        logTap(`[CONFIRM SUCCESS] resolved=${resolved}`);
        // Keep optimistic, remove from pending
        setPendingCompletionIds((prev) => {
          const next = new Map(prev);
          next.delete(resolved);
          return next;
        });
      } else {
        // Server didn't confirm - wait then verify
        logTap(`[CONFIRM PENDING] resolved=${resolved} - waiting for refetch`);
        
        setTimeout(() => {
          // If still not confirmed after 2 seconds, revert
          if (!isServerChecked(task)) {
            logTap(`[CONFIRM FAIL] id=${resolved} status=${task.status} completed_at=${task.completed_at ? "1" : "0"}`);
            setOptimisticCompletedIds((prev) => {
              const next = new Set(prev);
              next.delete(resolved);
              return next;
            });
            toast.error("Task completion didn't save. Please try again.");
          }
          
          // Always remove from pending after timeout
          setPendingCompletionIds((prev) => {
            const next = new Map(prev);
            next.delete(resolved);
            return next;
          });
        }, 2000);
      }
    } catch (e) {
      // Revert optimistic and remove pending on error
      setOptimisticCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(resolved);
        return next;
      });
      setPendingCompletionIds((prev) => {
        const next = new Map(prev);
        next.delete(resolved);
        return next;
      });
      logTap(`[MUTATE ERROR] ${summarizeError(e)}`);
      toast.error("Couldn't complete task. Please try again.");
    }
  };

  // Show max 3 tasks
  const activeTasks = allActiveTasks.slice(0, 3);

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <div>
      <MobileTapDebugOverlay lastTap={lastTap} />
      
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
        {activeTasks.map((task) => {
          const completionId = (task as any).task_occurrence_id ?? (task as any).occurrence_id ?? (task as any).task_id ?? task.id;
          const resolved = resolveId(String(completionId));
          const serverChecked = isServerChecked(task);
          // Locked check: pending confirmation prevents UI flapping
          const isLocked = pendingCompletionIds.has(resolved);
          const checked = optimisticCompletedIds.has(resolved) || serverChecked;

          return (
            <MobileTaskCard
              key={task.id}
              taskId={task.id}
              checked={checked}
              disabled={completeTask.isPending || serverChecked || isLocked}
              onComplete={() => {
                if (completeTask.isPending || serverChecked || isLocked) return;
                void handleComplete(task);
              }}
              onDetailsClick={() => navigate("/staff/tasks")}
              logTap={logTap}
              priorityBorder={task.priority === "high" ? "high" : task.priority === "medium" ? "medium" : "default"}
              className="bg-gradient-to-r from-primary/5 to-transparent"
            >
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
            </MobileTaskCard>
          );
        })}
      </div>
    </div>
  );
};

