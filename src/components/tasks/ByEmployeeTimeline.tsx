import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Timer,
  Users,
  MapPin,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { Employee } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { useScheduledEmployees, ScheduledEmployee } from "@/hooks/useScheduledEmployees";
import { useShiftCoverage } from "@/hooks/useShiftCoverage";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { 
  isTaskOverdue, 
  getTaskDate,
  getOccurrencesForDate,
  isVirtualId,
} from "@/lib/taskOccurrenceEngine";

interface ByEmployeeTimelineProps {
  tasks: Task[];
  employees: Employee[];
  onComplete: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  isLoading?: boolean;
}

// ── Stat Mini-Card ──────────────────────────────────────────────
const StatMiniCard = ({
  count,
  label,
  icon: Icon,
  colorClass,
}: {
  count: number;
  label: string;
  icon: React.ElementType;
  colorClass: string;
}) => (
  <div className={`flex flex-col items-center justify-center rounded-lg border px-4 py-2 min-w-[80px] ${colorClass}`}>
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4" />
      <span className="text-xl font-bold">{count}</span>
    </div>
    <span className="text-[11px] font-medium opacity-80 mt-0.5">{label}</span>
  </div>
);

// ── Hour-grouped Task Row ───────────────────────────────────────
const HourTaskRow = ({
  task,
  onComplete,
  onEdit,
}: {
  task: Task;
  onComplete: () => void;
  onEdit: () => void;
}) => {
  const { t } = useTranslation();
  const isVirtual = isVirtualId(task.id);
  const overdue = isTaskOverdue(task);
  const isCompleted = task.status === "completed";
  const isRecurring = task.recurrence_type && task.recurrence_type !== "none";
  const taskDate = getTaskDate(task);

  const statusIcon = isCompleted ? (
    <CheckCircle2 className="h-4 w-4 text-green-600" />
  ) : overdue ? (
    <AlertCircle className="h-4 w-4 text-destructive" />
  ) : (
    <Clock className="h-4 w-4 text-amber-500" />
  );

  const statusLabel = isCompleted
    ? t("tasks.completed")
    : overdue
    ? t("tasks.overdue")
    : t("tasks.pending");

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-colors hover:bg-muted/40 ${
        isVirtual ? "border border-dashed border-primary/30" : ""
      }`}
    >
      {/* Time */}
      <span className="w-12 shrink-0 text-xs font-mono text-muted-foreground">
        {taskDate ? format(taskDate, "HH:mm") : "--:--"}
      </span>

      {/* Checkbox */}
      <Checkbox
        checked={isCompleted}
        disabled
        className="shrink-0"
      />

      {/* Title */}
      <div
        className="flex-1 min-w-0 flex items-center gap-2"
      >
        <span
          className={`truncate font-medium ${
            isCompleted ? "line-through text-muted-foreground" : ""
          }`}
        >
          {task.title}
        </span>
        {isRecurring && <RefreshCw className="h-3 w-3 text-primary shrink-0" />}
      </div>

      {/* Status chip */}
      <div className="flex items-center gap-1.5 shrink-0">
        {statusIcon}
        <span className="text-xs hidden sm:inline">{statusLabel}</span>
      </div>

      {/* Duration */}
      {task.duration_minutes && (
        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
          <Timer className="h-3 w-3" />
          {task.duration_minutes}m
        </span>
      )}

      {/* Priority */}
      <Badge
        variant={
          task.priority === "urgent" || task.priority === "high"
            ? "destructive"
            : "secondary"
        }
        className="text-[10px] shrink-0"
      >
        {task.priority}
      </Badge>
    </div>
  );
};

// ── Employee Card ───────────────────────────────────────────────
const EmployeeCard = ({
  employee,
  dayTasks,
  selectedDate,
  defaultOpen,
  onComplete,
  onEdit,
}: {
  employee: ScheduledEmployee;
  dayTasks: Task[];
  selectedDate: Date;
  defaultOpen: boolean;
  onComplete: (taskId: string) => void;
  onEdit: (taskId: string) => void;
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  const completed = dayTasks.filter((tk) => tk.status === "completed").length;
  const overdue = dayTasks.filter((tk) => isTaskOverdue(tk)).length;
  const pending = dayTasks.length - completed;
  const completionPct =
    dayTasks.length > 0 ? Math.round((completed / dayTasks.length) * 100) : 0;
  const hasNoTasks = dayTasks.length === 0;

  const shiftTimeDisplay =
    employee.shiftStartTime && employee.shiftEndTime
      ? `${employee.shiftStartTime.slice(0, 5)}–${employee.shiftEndTime.slice(0, 5)}`
      : null;

  // Group tasks by hour
  const tasksByHour = useMemo(() => {
    const sorted = [...dayTasks].sort((a, b) => {
      const da = getTaskDate(a);
      const db = getTaskDate(b);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });
    return sorted;
  }, [dayTasks]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card
        className={`overflow-hidden ${
          overdue > 0
            ? "border-destructive/40 shadow-sm shadow-destructive/10"
            : hasNoTasks
            ? "border-amber-300/50"
            : ""
        }`}
      >
        {/* ── Header (always visible) ── */}
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer hover:bg-muted/30 transition-colors p-4">
            {/* Row 1: employee info */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={employee.avatar_url || undefined} />
                <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                  {employee.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">
                  {employee.full_name}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span>{employee.shiftRole || employee.role}</span>
                  {shiftTimeDisplay && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="text-primary/80 font-medium">
                        {shiftTimeDisplay}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress bar + expand icon (desktop) */}
              <div className="hidden sm:flex items-center gap-3">
                {!hasNoTasks && (
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Progress value={completionPct} className="h-2 flex-1" />
                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                      {completionPct}%
                    </span>
                  </div>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Row 2: stat mini-cards */}
            {hasNoTasks ? (
              <Badge
                variant="outline"
                className="text-xs gap-1 border-amber-400 text-amber-700 bg-amber-50"
              >
                <AlertTriangle className="h-3 w-3" />
                {t("tasks.noTasksAssigned", "No tasks assigned")}
              </Badge>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <StatMiniCard
                  count={overdue}
                  label={t("tasks.overdue")}
                  icon={AlertCircle}
                  colorClass={
                    overdue > 0
                      ? "bg-destructive/10 border-destructive/30 text-destructive"
                      : "bg-muted/50 border-border text-muted-foreground"
                  }
                />
                <StatMiniCard
                  count={pending}
                  label={t("tasks.pending")}
                  icon={Clock}
                  colorClass={
                    pending > 0
                      ? "bg-amber-50 border-amber-300 text-amber-700"
                      : "bg-muted/50 border-border text-muted-foreground"
                  }
                />
                <StatMiniCard
                  count={completed}
                  label={t("tasks.completed")}
                  icon={CheckCircle2}
                  colorClass={
                    completed > 0
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "bg-muted/50 border-border text-muted-foreground"
                  }
                />

                {/* Progress bar (mobile) */}
                <div className="flex sm:hidden items-center gap-2 flex-1 min-w-[100px]">
                  <Progress value={completionPct} className="h-2 flex-1" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {completionPct}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleTrigger>

        {/* ── Expandable task list ── */}
        <CollapsibleContent>
          <div className="border-t">
            {hasNoTasks ? (
              <div className="p-4">
                <Alert variant="default" className="border-amber-300 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">
                    {t("tasks.noTasksAssigned", "No tasks assigned")}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 text-sm">
                    {t(
                      "tasks.noTasksAssignedHelper",
                      "Check task templates, role assignments, and location coverage."
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="p-3 space-y-0.5">
                <div className="text-xs font-medium text-muted-foreground px-3 pb-2 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {t("tasks.tasksByHour", "Tasks by Hour")}
                </div>
                {tasksByHour.map((task) => (
                  <HourTaskRow
                    key={task.id}
                    task={task}
                    onComplete={() => onComplete(task.id)}
                    onEdit={() => onEdit(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

// ── Main Component ──────────────────────────────────────────────
export const ByEmployeeTimeline = ({
  tasks,
  employees,
  onComplete,
  onEdit,
  onDelete,
  isLoading: isLoadingTasks,
}: ByEmployeeTimelineProps) => {
  const { t } = useTranslation();
  const { company } = useCompanyContext();
  const { data: locations = [] } = useLocations();

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const { data: scheduledEmployees = [], isLoading: isLoadingScheduled } =
    useScheduledEmployees({
      targetDate: selectedDate,
      locationId: locationFilter === "all" ? undefined : locationFilter,
    });

  const { data: shifts = [] } = useShiftCoverage({
    startDate: selectedDate,
    endDate: selectedDate,
    locationId: locationFilter === "all" ? undefined : locationFilter,
    companyId: company?.id,
  });

  // Helper: check if task time falls within shift window (with 30 min grace)
  const isTaskWithinShift = (
    taskStartAt: string | null,
    shiftStart: string | null,
    shiftEnd: string | null
  ): boolean => {
    if (!taskStartAt || !shiftStart || !shiftEnd) return true;
    const taskDate = new Date(taskStartAt);
    const taskMinutes = taskDate.getHours() * 60 + taskDate.getMinutes();
    const [shiftStartH, shiftStartM] = shiftStart.split(":").map(Number);
    const [shiftEndH, shiftEndM] = shiftEnd.split(":").map(Number);
    const shiftStartMinutes = shiftStartH * 60 + shiftStartM;
    const shiftEndMinutes = shiftEndH * 60 + shiftEndM;
    const graceMinutes = 30;
    return (
      taskMinutes >= shiftStartMinutes - graceMinutes &&
      taskMinutes <= shiftEndMinutes
    );
  };

  // Build employee→tasks mapping (same logic as before)
  const employeesWithTasks = useMemo(() => {
    return scheduledEmployees.map((emp) => {
      const empTasks = getOccurrencesForDate(
        tasks.filter((t) => {
          if (t.assigned_to === emp.id) {
            return isTaskWithinShift(t.start_at, emp.shiftStartTime, emp.shiftEndTime);
          }
          if (t.assigned_role?.name) {
            const empRoleStr = emp.shiftRole || String(emp.role || "");
            const empRole = empRoleStr.toLowerCase();
            const taskRole = t.assigned_role.name.toLowerCase();
            if (empRole === taskRole) {
              if (!t.location_id || t.location_id === emp.shiftLocationId) {
                return isTaskWithinShift(t.start_at, emp.shiftStartTime, emp.shiftEndTime);
              }
            }
          }
          return false;
        }),
        selectedDate,
        { includeCompleted: true }
      );
      return { employee: emp, tasks: empTasks };
    });
  }, [scheduledEmployees, tasks, selectedDate]);

  // Sort by urgency: most overdue first, then pending, then no tasks last
  const sortedEmployees = useMemo(() => {
    return [...employeesWithTasks].sort((a, b) => {
      const aOverdue = a.tasks.filter((tk) => isTaskOverdue(tk)).length;
      const bOverdue = b.tasks.filter((tk) => isTaskOverdue(tk)).length;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      const aPending = a.tasks.filter((tk) => tk.status !== "completed").length;
      const bPending = b.tasks.filter((tk) => tk.status !== "completed").length;
      if (aPending !== bPending) return bPending - aPending;
      if (a.tasks.length === 0 && b.tasks.length > 0) return 1;
      if (b.tasks.length === 0 && a.tasks.length > 0) return -1;
      return a.employee.full_name.localeCompare(b.employee.full_name);
    });
  }, [employeesWithTasks]);

  // Summary stats
  const totalEmployees = scheduledEmployees.length;
  const totalTasks = employeesWithTasks.reduce((acc, { tasks }) => acc + tasks.length, 0);
  const totalCompleted = employeesWithTasks.reduce(
    (acc, { tasks }) => acc + tasks.filter((t) => t.status === "completed").length,
    0
  );
  const totalOverdue = employeesWithTasks.reduce(
    (acc, { tasks }) => acc + tasks.filter((t) => isTaskOverdue(t)).length,
    0
  );
  const employeesWithNoTasks = employeesWithTasks.filter(
    ({ tasks }) => tasks.length === 0
  ).length;

  const navigateDate = (direction: "prev" | "next") => {
    setSelectedDate((prev) => addDays(prev, direction === "next" ? 1 : -1));
  };

  const isLoading = isLoadingTasks || isLoadingScheduled;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Controls Bar ── */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateDate("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[140px] justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {isSameDay(selectedDate, new Date())
                    ? t("common.today")
                    : isSameDay(selectedDate, addDays(new Date(), 1))
                    ? t("common.tomorrow")
                    : format(selectedDate, "EEE, MMM d")}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateDate("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setSelectedDate(startOfDay(new Date()))}
              >
                {t("common.today")}
              </Button>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[150px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("common.allLocations")}
                  </SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary Badges */}
            <div className="flex items-center gap-3 ml-auto text-sm flex-wrap">
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {totalEmployees} {t("workforce.employees.label")}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                {totalTasks} {t("tasks.title")}
              </Badge>
              {employeesWithNoTasks > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-400 text-amber-700"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {employeesWithNoTasks} {t("tasks.withNoTasks", "with no tasks")}
                </Badge>
              )}
              {totalOverdue > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {totalOverdue} {t("tasks.overdue")}
                </Badge>
              )}
              <Badge className="bg-green-100 text-green-800 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {totalCompleted} {t("tasks.completed")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Employee Cards ── */}
      {scheduledEmployees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">
              {t("tasks.noEmployeesScheduled", "No employees scheduled")}
            </p>
            <p className="text-sm mt-1">
              {t(
                "tasks.selectDifferentDateOrLocation",
                "Try selecting a different date or location"
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedEmployees.map(({ employee, tasks: empTasks }) => {
            const hasOverdue = empTasks.some((tk) => isTaskOverdue(tk));
            return (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                dayTasks={empTasks}
                selectedDate={selectedDate}
                defaultOpen={hasOverdue}
                onComplete={onComplete}
                onEdit={onEdit}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
