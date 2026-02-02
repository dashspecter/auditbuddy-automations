import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { ListTodo, Clock, AlertCircle, MapPin, Timer, ChevronDown, ChevronUp, Calendar, Users, RefreshCw, Bug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCompleteTask, Task } from "@/hooks/useTasks";
import { useMyTaskOccurrences } from "@/hooks/useMyTaskOccurrences";
import { format, differenceInSeconds } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { MobileTapDebugOverlay, useTapDebug, useNetworkStatus } from "@/components/staff/MobileTapDebugOverlay";
import { MobileTaskCard } from "@/components/staff/MobileTaskCard";
import { toast } from "sonner";

// Countdown timer component
const CountdownTimer = ({ startAt, durationMinutes }: { startAt: string; durationMinutes: number }) => {
  const { t } = useTranslation();
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
        {t('tasks.staff.timeExpired')}
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
      {formatTime(timeLeft)} {t('tasks.staff.timeLeft')}
    </Badge>
  );
};

const StaffTasks = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { 
    todayGrouped, 
    tomorrowTasks,
    upcomingTasks, 
    isLoading,
    rawTasks,
    debug,
    shifts, // Shifts from coverage hook for debug panel
  } = useMyTaskOccurrences();
  const completeTask = useCompleteTask();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const { lastTap, logTap } = useTapDebug();
  const isOnline = useNetworkStatus();

  // Optimistic completion state with pending confirmation lock
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState<Set<string>>(() => new Set());
  // Tracks tasks currently waiting for server confirmation: Map<resolvedId, startTimestamp>
  const [pendingCompletionIds, setPendingCompletionIds] = useState<Map<string, number>>(() => new Map());

  const resolveId = (id: string) => {
    const match = id.match(
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    );
    return match ? match[1] : id;
  };

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
  
  // Show debug if ?debugTasks=1 query param or DEV toggle
  const debugFromUrl = searchParams.get("debugTasks") === "1";
  const [showDebug, setShowDebug] = useState(debugFromUrl);
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [shiftsInfo, setShiftsInfo] = useState<any[]>([]);

  const [testQueryResult, setTestQueryResult] = useState<any>(null);

  // Fetch employee + shift info for enhanced debugging
  useEffect(() => {
    const fetchDebugInfo = async () => {
      if (!user?.id || (!showDebug && !debugFromUrl)) return;
      
      // Get employee info
      const { data: emp } = await supabase
        .from("employees")
        .select("id, role, location_id, company_id, locations(name)")
        .eq("user_id", user.id)
        .single();
      
      setEmployeeInfo(emp);
      
      if (emp) {
        // Get today's shifts for this employee
        const today = new Date().toISOString().split('T')[0];
        const { data: assignments, error: assignmentsError } = await supabase
          .from("shift_assignments")
          .select(`
            id,
            approval_status,
            shifts!inner(
              id,
              shift_date,
              start_time,
              end_time,
              role,
              location_id,
              locations(name)
            )
          `)
          .eq("staff_id", emp.id)
          .eq("shifts.shift_date", today);
        
        setShiftsInfo(assignments || []);
        
        if (import.meta.env.DEV) {
          // Log all distinct approval statuses for diagnostics
          const statuses = [...new Set((assignments || []).map((a: any) => a.approval_status))];
          console.log("[StaffTasks Debug] Shift assignments:", {
            count: assignments?.length || 0,
            statuses,
            error: assignmentsError?.message,
          });
        }
        
        // DEV-ONLY: Test query to verify RLS allows reading tasks for this company
        if (import.meta.env.DEV && emp.company_id) {
          const { data: testTasks, error: testError } = await supabase
            .from("tasks")
            .select("id, title, status, assigned_role_id, location_id")
            .eq("company_id", emp.company_id)
            .limit(5);
          
          setTestQueryResult({
            count: testTasks?.length ?? 0,
            error: testError?.message || null,
            sample: testTasks?.slice(0, 2).map((t: any) => ({ id: t.id?.slice(0, 8), title: t.title?.slice(0, 20) })),
          });
          
          console.log("[StaffTasks Debug] RLS test query:", {
            companyId: emp.company_id,
            tasksFound: testTasks?.length ?? 0,
            error: testError?.message,
          });
        }
      }
    };
    
    fetchDebugInfo();
  }, [user?.id, showDebug, debugFromUrl]);

  const completeTaskRow = async (task: any, completionId: string) => {
    // Network check before attempting mutation
    if (!isOnline) {
      logTap(`[offline blocked] task.id=${task.id}`);
      toast.error("No internet. Can't complete right now.");
      return;
    }

    const resolved = resolveId(completionId);
    
    // Prevent duplicate submissions while pending
    if (pendingCompletionIds.has(resolved)) {
      logTap(`[MUTATE blocked - already pending] resolved=${resolved}`);
      return;
    }

    logTap(
      `[MUTATE] task.id=${task.id} completionId=${completionId} resolved=${resolved} status=${task.status} completed_at=${(task as any).completed_at ? "1" : "0"}`,
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
      const updated = await completeTask.mutateAsync(completionId);
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
          // Check if task is now in completed list
          const taskInCompleted = completedTasks.some((t) => {
            const tid = resolveId(String((t as any).task_occurrence_id ?? (t as any).occurrence_id ?? (t as any).task_id ?? t.id));
            return tid === resolved;
          });
          
          if (!taskInCompleted && !isServerChecked(task)) {
            logTap(`[CONFIRM FAIL] id=${resolved} status=${task.status} completed_at=${(task as any).completed_at ? "1" : "0"}`);
            // Revert optimistic
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

  // Use occurrence engine groupings - combine pending + overdue for active
  const activePendingTasks = [...todayGrouped.pending, ...todayGrouped.overdue];
  const completedTasks = todayGrouped.completed;

  // Count recurring templates for debug
  const recurringTemplates = rawTasks.filter(
    (t) => t.recurrence_type && t.recurrence_type !== "none"
  );
  const completedRecurring = recurringTemplates.filter(
    (t) => t.status === "completed"
  );

  // Badge consistency check: active + upcoming should match home badge
  const badgeCount = activePendingTasks.length + upcomingTasks.length;

  // DEV-only comprehensive logging for parity verification
  if (import.meta.env.DEV) {
    console.log("[StaffTasks] Full pipeline debug:", {
      rawTasksCount: rawTasks.length,
      recurringTemplatesCount: recurringTemplates.length,
      completedRecurringCount: completedRecurring.length,
      pipeline: {
        generated: debug?.today?.generated ?? 'N/A',
        covered: debug?.today?.covered ?? 'N/A',
        visible: debug?.today?.visible ?? 'N/A',
      },
      display: {
        activePending: activePendingTasks.length,
        upcoming: upcomingTasks.length,
        completed: completedTasks.length,
        overdue: todayGrouped.overdue.length,
        noCoverage: todayGrouped.noCoverage.length,
      },
      badgeCount,
      // Parity check: this should equal the StaffHome badge
      consistency: `Badge should show: ${badgeCount}`,
    });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobileTapDebugOverlay lastTap={lastTap} />
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">{t('tasks.staff.title')}</h1>
            {import.meta.env.DEV && (
              <button 
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                {showDebug ? "Hide Debug" : "Debug"}
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">
              {activePendingTasks.length} {t('tasks.staff.active')}
            </Badge>
            {upcomingTasks.length > 0 && (
              <Badge variant="outline">
                {upcomingTasks.length} {t('tasks.staff.upcoming')}
              </Badge>
            )}
            <Badge variant="outline">
              {completedTasks.length} {t('tasks.completed')}
            </Badge>
            {tomorrowTasks.length > 0 && (
              <Badge variant="outline" className="border-dashed">
                {tomorrowTasks.length} Tomorrow
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Debug Panel */}
        {(showDebug || debugFromUrl) && (
          <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-xs font-mono overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <Bug className="h-4 w-4 text-amber-600" />
              <h3 className="font-bold text-amber-800 dark:text-amber-200">Task Debug Panel</h3>
            </div>
            
            {/* Employee Info */}
            {employeeInfo && (
              <div className="mb-3 p-2 bg-background/50 rounded">
                <div className="font-bold mb-1">Employee:</div>
                <div>ID: {employeeInfo.id?.slice(0, 8)}...</div>
                <div>Role: {employeeInfo.role || 'None'}</div>
                <div>Location: {employeeInfo.locations?.name || employeeInfo.location_id?.slice(0, 8) || 'None'}</div>
                <div>Company: {employeeInfo.company_id?.slice(0, 8)}...</div>
              </div>
            )}
            
            {/* Today's Shifts */}
            <div className="mb-3 p-2 bg-background/50 rounded">
              <div className="font-bold mb-1">Today's Shifts ({shiftsInfo.length}):</div>
              {shiftsInfo.length === 0 ? (
                <div className="text-destructive">⚠ No shifts found for today</div>
              ) : (
                shiftsInfo.map((a: any, i: number) => (
                  <div key={i} className="text-[10px] border-b border-dashed pb-1 mb-1">
                    {a.shifts?.start_time?.slice(0,5)}-{a.shifts?.end_time?.slice(0,5)} | 
                    Role: "{a.shifts?.role}" | 
                    Loc: {a.shifts?.locations?.name || a.shifts?.location_id?.slice(0,8)} | 
                    Status: {a.approval_status}
                  </div>
                ))
              )}
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-background/50 rounded mb-3">
              <div className="col-span-2 font-bold">Pipeline Stages:</div>
              <div>rawTasks: {rawTasks.length}</div>
              <div className={shifts.length === 0 ? "text-destructive font-bold" : ""}>
                shiftsCount: {shifts.length}
              </div>
              <div>recurringTemplates: {recurringTemplates.length}</div>
              <div>today.generated: {debug?.today?.generated ?? 'N/A'}</div>
              <div>today.covered: {debug?.today?.covered ?? 'N/A'}</div>
              <div>today.noCoverage: {debug?.today?.noCoverage ?? 'N/A'}</div>
              <div>today.visible: {debug?.today?.visible ?? 'N/A'}</div>
            </div>

            {/* Coverage Reasons */}
            {debug?.coverageReasons && (
              <div className="mb-3 p-2 bg-background/50 rounded">
                <div className="font-bold mb-1">No-Coverage Reasons:</div>
                <div className="grid grid-cols-2 gap-1">
                  <div>noShift: {debug.coverageReasons.noShift}</div>
                  <div>roleMismatch: {debug.coverageReasons.roleMismatch}</div>
                  <div>locationMismatch: {debug.coverageReasons.locationMismatch}</div>
                  <div>noApproved: {debug.coverageReasons.noApprovedAssignments}</div>
                  <div className={debug.coverageReasons.taskRoleNameMissing > 0 ? "text-destructive font-bold" : ""}>
                    roleNameMissing: {debug.coverageReasons.taskRoleNameMissing}
                  </div>
                </div>
              </div>
            )}

            {/* RLS Test Query (DEV only) */}
            {import.meta.env.DEV && testQueryResult && (
              <div className="mb-3 p-2 bg-background/50 rounded">
                <div className="font-bold mb-1">RLS Test Query (company tasks):</div>
                <div className={testQueryResult.error ? "text-destructive" : "text-green-600"}>
                  {testQueryResult.error 
                    ? `❌ Error: ${testQueryResult.error}` 
                    : `✅ Found ${testQueryResult.count} tasks`}
                </div>
                {testQueryResult.sample && testQueryResult.sample.length > 0 && (
                  <div className="text-[10px] mt-1">
                    Sample: {testQueryResult.sample.map((t: any) => `${t.id}...`).join(", ")}
                  </div>
                )}
              </div>
            )}

            {/* Display Buckets */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-background/50 rounded">
              <div className="col-span-2 font-bold">Display Buckets:</div>
              <div>activePending: {activePendingTasks.length}</div>
              <div>upcoming: {upcomingTasks.length}</div>
              <div>overdue: {todayGrouped.overdue.length}</div>
              <div>completed: {completedTasks.length}</div>
              <div>noCoverage: {todayGrouped.noCoverage.length}</div>
              <div className="col-span-2 font-bold text-primary">
                Badge Count: {badgeCount}
              </div>
            </div>

            {/* Weekly Recurrence Diagnostics */}
            {debug?.weeklyRecurrence && (
              <div className="mt-3 p-2 bg-background/50 rounded">
                <div className="font-bold mb-1">Weekly Recurrence (Company TZ):</div>
                <div className="grid grid-cols-2 gap-1">
                  <div>Today: {debug.weeklyRecurrence.companyTodayKey}</div>
                  <div>Weekday: {debug.weeklyRecurrence.companyTodayWeekdayName} ({debug.weeklyRecurrence.companyTodayWeekday})</div>
                  <div>Weekly Templates: {debug.weeklyRecurrence.weeklyTemplatesCount}</div>
                  <div>With days_of_week: {debug.weeklyRecurrence.weeklyTemplatesWithDaysOfWeek}</div>
                  <div className={debug.weeklyRecurrence.templatesMatchingToday === 0 && debug.weeklyRecurrence.weeklyTemplatesCount > 0 ? "col-span-2 text-amber-600 font-bold" : "col-span-2"}>
                    Matching today: {debug.weeklyRecurrence.templatesMatchingToday}
                    {debug.weeklyRecurrence.templatesMatchingToday === 0 && debug.weeklyRecurrence.weeklyTemplatesCount > 0 && (
                      <span className="text-xs font-normal ml-2">
                        (no tasks today - check recurrence_days_of_week)
                      </span>
                    )}
                  </div>
                </div>
                {debug.weeklyRecurrence.templatesSummary.length > 0 && (
                  <div className="mt-2 text-[10px]">
                    <div className="font-bold mb-1">Templates:</div>
                    {debug.weeklyRecurrence.templatesSummary.map((t, i) => (
                      <div key={i} className={`border-b border-dashed pb-1 mb-1 ${t.matchesToday ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {t.id}... "{t.title}" | days: [{t.normalizedDays.join(',')}] | 
                        {t.matchesToday ? ' ✅ matches today' : ' ❌ not today'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sample Tasks */}
            {rawTasks.length > 0 && (
              <div className="mt-3 p-2 bg-background/50 rounded">
                <div className="font-bold mb-1">Sample Raw Tasks:</div>
                {rawTasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="text-[10px] truncate mb-1">
                    <div>{t.title} | status:{t.status}</div>
                    <div className="pl-2">
                      role_id: {t.assigned_role_id?.slice(0,8) || 'none'} | 
                      role_name: <span className={!t.assigned_role?.name ? "text-destructive font-bold" : "text-green-600"}>
                        {t.assigned_role?.name || 'MISSING'}
                      </span>
                    </div>
                    <div className="pl-2">
                      loc: {t.location?.name || t.location_id?.slice(0,8) || 'none'} | 
                      recur: {t.recurrence_type || 'none'} |
                      exec_mode: {(t as any).execution_mode || 'shift_based'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state explanation */}
            {rawTasks.length === 0 && (
              <div className="mt-3 p-2 bg-destructive/10 rounded">
                <div className="font-bold mb-1 text-destructive">⚠ rawTasks is EMPTY</div>
                <div className="text-[10px]">
                  This is NOT a coverage issue - tasks are not being fetched at all.<br/>
                  Check: RLS policies, employee.role matching, employee.company_id, shift existence.
                </div>
              </div>
            )}
          </Card>
        )}
        {/* Active Tasks */}
        {activePendingTasks.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              {t('tasks.staff.toDoNow')}
            </h2>
            <div className="space-y-2">
              {activePendingTasks.map((task) => {
                const isExpanded = expandedTaskId === task.id;
                const isRecurring = task.recurrence_type && task.recurrence_type !== "none";
                const completionId = String(
                  (task as any).task_occurrence_id ??
                    (task as any).occurrence_id ??
                    (task as any).task_id ??
                    task.id,
                );
                const resolved = resolveId(completionId);
                const serverChecked = isServerChecked(task);
                // Locked check: optimistic OR server confirmed OR pending confirmation
                const isLocked = pendingCompletionIds.has(resolved);
                const checked = optimisticCompletedIds.has(resolved) || serverChecked;
                
                return (
                  <MobileTaskCard
                    key={task.id}
                    taskId={task.id}
                    checked={checked}
                    disabled={completeTask.isPending || serverChecked || isLocked}
                    onComplete={() => {
                      logTap(
                        `[box tap] id=${task.id} completionId=${completionId} resolved=${resolved} status=${task.status} completed_at=${(task as any).completed_at ? "1" : "0"} pending=${isLocked}`,
                      );
                      if (completeTask.isPending || serverChecked || isLocked) return;
                      void completeTaskRow(task, completionId);
                    }}
                    onDetailsClick={() => toggleExpand(task.id)}
                    logTap={logTap}
                  >
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
                          {(task as any).visibility_reason === "missed_after_shift" && (
                            <Badge variant="destructive" className="text-xs">
                              Missed
                            </Badge>
                          )}
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
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          {task.description && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">{t('tasks.staff.description')}</p>
                              <p className="text-sm">{task.description}</p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {task.start_at && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {t('tasks.staff.startTime')}
                                </p>
                                <p>{format(new Date(task.start_at), "MMM d, h:mm a")}</p>
                              </div>
                            )}
                            
                            {task.duration_minutes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Timer className="h-3 w-3" />
                                  {t('tasks.staff.duration')}
                                </p>
                                <p>{task.duration_minutes} {t('tasks.staff.minutes')}</p>
                              </div>
                            )}
                            
                            {task.location?.name && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {t('tasks.staff.location')}
                                </p>
                                <p>{task.location.name}</p>
                              </div>
                            )}
                            
                            {task.assigned_role?.name && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {t('tasks.staff.assignedRole')}
                                </p>
                                <p>{task.assigned_role.name}</p>
                              </div>
                            )}
                          </div>
                          
                          {isRecurring && (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                {t('tasks.staff.recurrence')}
                              </p>
                              <p className="text-sm text-primary">
                                {t('tasks.staff.repeats')} {t(`tasks.staff.${task.recurrence_type}`)}
                                {task.recurrence_interval && task.recurrence_interval > 1
                                  ? ` ${t('tasks.staff.every')} ${task.recurrence_interval} ${
                                      task.recurrence_type === "daily" ? t('tasks.staff.days') :
                                      task.recurrence_type === "weekly" ? t('tasks.staff.weeks') : t('tasks.staff.months')
                                    }`
                                  : ""}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </MobileTaskCard>
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
              {t('tasks.staff.comingUp')}
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
                          {t('tasks.staff.starts')}: {format(new Date(task.start_at), "h:mm a")}
                          {task.duration_minutes && ` • ${task.duration_minutes} ${t('tasks.staff.minToComplete')}`}
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
            <h2 className="font-semibold mb-3 text-muted-foreground">{t('tasks.staff.completedSection')}</h2>
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
                      onPointerDown={() => logTap(`[row pointerdown] ${task.id}`)}
                      onClick={() => {
                        logTap(`[row click] ${task.id}`);
                        toggleExpand(task.id);
                      }}
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
                                <Badge variant="destructive" className="text-xs">{t('tasks.late')}</Badge>
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
                              <p className="text-xs font-medium text-muted-foreground mb-1">{t('tasks.staff.description')}</p>
                              <p className="text-sm">{task.description}</p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {task.start_at && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {t('tasks.staff.started')}
                                </p>
                                <p>{format(new Date(task.start_at), "MMM d, h:mm a")}</p>
                              </div>
                            )}
                            
                            {task.duration_minutes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Timer className="h-3 w-3" />
                                  {t('tasks.staff.duration')}
                                </p>
                                <p>{task.duration_minutes} {t('tasks.staff.minutes')}</p>
                              </div>
                            )}
                            
                            {task.location?.name && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {t('tasks.staff.location')}
                                </p>
                                <p>{task.location.name}</p>
                              </div>
                            )}
                            
                            {task.assigned_role?.name && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {t('tasks.staff.assignedRole')}
                                </p>
                                <p>{task.assigned_role.name}</p>
                              </div>
                            )}
                          </div>
                          
                          {isRecurring && (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                {t('tasks.staff.recurrence')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t('tasks.staff.repeats')} {t(`tasks.staff.${task.recurrence_type}`)}
                                {task.recurrence_interval && task.recurrence_interval > 1
                                  ? ` ${t('tasks.staff.every')} ${task.recurrence_interval} ${
                                      task.recurrence_type === "daily" ? t('tasks.staff.days') :
                                      task.recurrence_type === "weekly" ? t('tasks.staff.weeks') : t('tasks.staff.months')
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

        {activePendingTasks.length === 0 && upcomingTasks.length === 0 && completedTasks.length === 0 && (
          <Card className="p-8 text-center">
            <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t('tasks.staff.noTasks')}</p>
            {(showDebug || debugFromUrl) && (
              <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-left font-mono">
                <p className="font-bold text-amber-600 mb-2">Debug: Why no tasks?</p>
                <p>• rawTasks: {rawTasks.length}</p>
                <p>• today.generated: {debug?.today?.generated ?? 0}</p>
                <p>• today.covered: {debug?.today?.covered ?? 0}</p>
                <p>• shiftsToday: {shiftsInfo.length}</p>
                {rawTasks.length > 0 && debug?.today?.covered === 0 && (
                  <p className="text-destructive mt-1">→ Tasks exist but none have shift coverage</p>
                )}
                {rawTasks.length === 0 && (
                  <p className="text-destructive mt-1">→ No tasks assigned to you or your role</p>
                )}
                {shiftsInfo.length === 0 && (
                  <p className="text-destructive mt-1">→ No approved shifts for today</p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffTasks;