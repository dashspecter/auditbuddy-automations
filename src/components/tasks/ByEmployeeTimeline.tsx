import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ClipboardList
} from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { Employee } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { useScheduledEmployees, ScheduledEmployee } from "@/hooks/useScheduledEmployees";
import { useShiftCoverage } from "@/hooks/useShiftCoverage";
import { format, addDays, startOfDay, isSameDay, parseISO } from "date-fns";
import { 
  isTaskOverdue, 
  getTaskDate,
  getTaskDeadline,
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

// Hour slots for the timeline (6 AM to 11 PM)
const TIMELINE_HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

// Calculate task position and width on timeline
const getTaskTimelinePosition = (task: Task) => {
  const taskDate = getTaskDate(task);
  if (!taskDate) return null;
  
  const hours = taskDate.getHours();
  const minutes = taskDate.getMinutes();
  const startPosition = ((hours - 6) * 60 + minutes) / (18 * 60) * 100;
  
  const duration = task.duration_minutes || 30;
  const width = (duration / (18 * 60)) * 100;
  
  return {
    left: Math.max(0, Math.min(100, startPosition)),
    width: Math.max(2, Math.min(100 - startPosition, width)),
    startHour: hours,
    startMinute: minutes,
    duration
  };
};

// Individual task block on the timeline
const TimelineTaskBlock = ({ 
  task, 
  position, 
  onComplete, 
  onEdit 
}: { 
  task: Task; 
  position: { left: number; width: number; startHour: number; startMinute: number; duration: number };
  onComplete: () => void;
  onEdit: () => void;
}) => {
  const { t } = useTranslation();
  const isVirtual = isVirtualId(task.id);
  const overdue = isTaskOverdue(task);
  const isCompleted = task.status === "completed";
  const isRecurring = task.recurrence_type && task.recurrence_type !== "none";
  
  const bgColor = isCompleted 
    ? "bg-green-500/80" 
    : overdue 
    ? "bg-destructive/80" 
    : "bg-primary/80";
  
  const borderStyle = isVirtual ? "border-2 border-dashed border-primary" : "";
  
  return (
    <div
      className={`absolute top-1 bottom-1 rounded-md ${bgColor} ${borderStyle} cursor-pointer hover:opacity-90 transition-opacity flex items-center overflow-hidden group`}
      style={{ 
        left: `${position.left}%`, 
        width: `${position.width}%`,
        minWidth: '24px'
      }}
      onClick={onEdit}
      title={`${task.title} - ${format(new Date().setHours(position.startHour, position.startMinute), 'HH:mm')} (${position.duration}m)`}
    >
      <div className="px-1.5 flex items-center gap-1 text-white text-xs truncate w-full">
        {isRecurring && <RefreshCw className="h-2.5 w-2.5 shrink-0" />}
        {isCompleted && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />}
        <span className="truncate font-medium">{task.title}</span>
      </div>
    </div>
  );
};

// Task list item (for expanded view)
const TaskListItem = ({ 
  task, 
  onComplete, 
  onEdit 
}: { 
  task: Task; 
  onComplete: () => void; 
  onEdit: () => void;
}) => {
  const { t } = useTranslation();
  const isVirtual = isVirtualId(task.id);
  const overdue = isTaskOverdue(task);
  const isRecurring = task.recurrence_type && task.recurrence_type !== "none";
  const taskDate = getTaskDate(task);
  
  return (
    <div 
      className={`flex items-center gap-3 p-2 border rounded-lg text-sm ${
        overdue ? "border-destructive/50 bg-destructive/5" : ""
      } ${isVirtual ? "border-dashed border-primary/30" : ""}`}
    >
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={() => task.status !== "completed" && !isVirtual && onComplete()}
        disabled={task.status === "completed" || isVirtual}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
          {isRecurring && <RefreshCw className="h-3 w-3 text-primary shrink-0" />}
          {overdue && task.status !== "completed" && (
            <Badge variant="destructive" className="text-xs">{t('tasks.overdue')}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          {taskDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(taskDate, "HH:mm")}
            </span>
          )}
          {task.duration_minutes && (
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {task.duration_minutes}m
            </span>
          )}
          {task.location?.name && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {task.location.name}
            </span>
          )}
        </div>
      </div>
      <Badge 
        variant={task.priority === "urgent" || task.priority === "high" ? "destructive" : "secondary"} 
        className="text-xs shrink-0"
      >
        {task.priority}
      </Badge>
    </div>
  );
};

// Timeline row for a single scheduled employee
const ScheduledEmployeeRow = ({ 
  employee, 
  dayTasks,
  selectedDate,
  onComplete, 
  onEdit 
}: { 
  employee: ScheduledEmployee;
  dayTasks: Task[];
  selectedDate: Date;
  onComplete: (taskId: string) => void;
  onEdit: (taskId: string) => void;
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate stats
  const completed = dayTasks.filter(t => t.status === "completed").length;
  const overdue = dayTasks.filter(t => isTaskOverdue(t)).length;
  const pending = dayTasks.length - completed;
  const completionRate = dayTasks.length > 0 ? Math.round((completed / dayTasks.length) * 100) : null;
  const hasNoTasks = dayTasks.length === 0;
  
  // Position tasks on timeline
  const positionedTasks = useMemo(() => {
    return dayTasks
      .map(task => ({
        task,
        position: getTaskTimelinePosition(task)
      }))
      .filter(({ position }) => position !== null);
  }, [dayTasks]);
  
  // Format shift time
  const shiftTimeDisplay = employee.shiftStartTime && employee.shiftEndTime
    ? `${employee.shiftStartTime.slice(0, 5)} – ${employee.shiftEndTime.slice(0, 5)}`
    : null;
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={`${overdue > 0 ? "border-destructive/30" : hasNoTasks ? "border-amber-300/50" : ""}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
            <div className="flex items-center gap-3">
              {/* Employee Info */}
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={employee.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{employee.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="min-w-[140px] shrink-0">
                <div className="font-medium text-sm truncate">{employee.full_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>{employee.shiftRole || employee.role}</span>
                  {shiftTimeDisplay && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="text-primary/80">{shiftTimeDisplay}</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Stats or No Tasks Alert */}
              <div className="hidden sm:flex items-center gap-2 text-xs shrink-0">
                {hasNoTasks ? (
                  <Badge variant="outline" className="text-xs gap-1 border-amber-400 text-amber-700 bg-amber-50">
                    <AlertTriangle className="h-3 w-3" />
                    {t('tasks.noTasksAssigned', 'No tasks assigned')}
                  </Badge>
                ) : (
                  <>
                    {overdue > 0 && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {overdue}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      {pending}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {completed}
                    </Badge>
                  </>
                )}
              </div>
              
              {/* Timeline Preview */}
              <div className="flex-1 h-8 bg-muted/50 rounded relative overflow-hidden hidden md:block">
                {/* Hour markers */}
                {[6, 9, 12, 15, 18, 21].map((hour) => (
                  <div 
                    key={hour}
                    className="absolute top-0 bottom-0 w-px bg-border/50"
                    style={{ left: `${((hour - 6) / 18) * 100}%` }}
                  />
                ))}
                
                {/* Task blocks */}
                {positionedTasks.map(({ task, position }) => (
                  position && (
                    <TimelineTaskBlock
                      key={task.id}
                      task={task}
                      position={position}
                      onComplete={() => onComplete(task.id)}
                      onEdit={() => onEdit(task.id)}
                    />
                  )
                ))}
                
                {/* No tasks indicator */}
                {hasNoTasks && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground italic">
                    {t('tasks.noTasksScheduled', 'No tasks scheduled')}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {completionRate !== null && (
                  <span className="text-xs text-muted-foreground hidden sm:block">{completionRate}%</span>
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {hasNoTasks ? (
              <Alert variant="default" className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">{t('tasks.noTasksAssigned', 'No tasks assigned')}</AlertTitle>
                <AlertDescription className="text-amber-700 text-sm">
                  {t('tasks.noTasksAssignedHelper', 'Check task templates, role assignments, and location coverage.')}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Full Timeline */}
                <div className="mb-4">
                  <div className="flex text-xs text-muted-foreground mb-1">
                    {TIMELINE_HOURS.filter((_, i) => i % 3 === 0).map((hour) => (
                      <div 
                        key={hour} 
                        className="flex-1 text-center"
                        style={{ marginLeft: hour === 6 ? '0' : undefined }}
                      >
                        {format(new Date().setHours(hour, 0), 'ha')}
                      </div>
                    ))}
                  </div>
                  <div className="h-10 bg-muted/30 rounded relative">
                    {/* Hour grid lines */}
                    {TIMELINE_HOURS.map((hour) => (
                      <div 
                        key={hour}
                        className="absolute top-0 bottom-0 w-px bg-border/30"
                        style={{ left: `${((hour - 6) / 18) * 100}%` }}
                      />
                    ))}
                    
                    {/* Current time indicator */}
                    {isSameDay(selectedDate, new Date()) && (
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                        style={{ 
                          left: `${((new Date().getHours() - 6) * 60 + new Date().getMinutes()) / (18 * 60) * 100}%` 
                        }}
                      >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
                      </div>
                    )}
                    
                    {/* Task blocks */}
                    {positionedTasks.map(({ task, position }) => (
                      position && (
                        <TimelineTaskBlock
                          key={task.id}
                          task={task}
                          position={position}
                          onComplete={() => onComplete(task.id)}
                          onEdit={() => onEdit(task.id)}
                        />
                      )
                    ))}
                  </div>
                </div>
                
                {/* Task list */}
                <div className="space-y-2">
                  {dayTasks.map((task) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      onComplete={() => onComplete(task.id)}
                      onEdit={() => onEdit(task.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export const ByEmployeeTimeline = ({
  tasks,
  employees,
  onComplete,
  onEdit,
  onDelete,
  isLoading: isLoadingTasks
}: ByEmployeeTimelineProps) => {
  const { t } = useTranslation();
  const { data: locations = [] } = useLocations();
  
  // State
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [locationFilter, setLocationFilter] = useState<string>("all");
  
  // Fetch scheduled employees from shifts (source of truth)
  const { data: scheduledEmployees = [], isLoading: isLoadingScheduled } = useScheduledEmployees({
    targetDate: selectedDate,
    locationId: locationFilter === "all" ? undefined : locationFilter,
  });
  
  // Fetch shifts for coverage checking
  const { data: shifts = [] } = useShiftCoverage({
    startDate: selectedDate,
    endDate: selectedDate,
    locationId: locationFilter === "all" ? undefined : locationFilter,
  });
  
  // Build employee task mapping with shift-aware logic
  const employeesWithTasks = useMemo(() => {
    return scheduledEmployees.map(emp => {
      // Get tasks for this employee: assigned directly OR matching their shift role
      const empTasks = getOccurrencesForDate(
        tasks.filter(t => {
          // Directly assigned
          if (t.assigned_to === emp.id) return true;
          
          // Role-based assignment: task's assigned_role matches employee's shift role
          if (t.assigned_role) {
            const empRoleStr = emp.shiftRole || String(emp.role || "");
            const empRole = empRoleStr.toLowerCase();
            const taskRoleStr = String(t.assigned_role || "");
            const taskRole = taskRoleStr.toLowerCase();
            if (empRole === taskRole) {
              // Also check location match (task location matches shift location, or task is global)
              if (!t.location_id || t.location_id === emp.shiftLocationId) {
                return true;
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
  
  // Summary stats
  const totalEmployees = scheduledEmployees.length;
  const totalTasks = employeesWithTasks.reduce((acc, { tasks }) => acc + tasks.length, 0);
  const totalCompleted = employeesWithTasks.reduce((acc, { tasks }) => 
    acc + tasks.filter(t => t.status === "completed").length, 0);
  const totalOverdue = employeesWithTasks.reduce((acc, { tasks }) => 
    acc + tasks.filter(t => isTaskOverdue(t)).length, 0);
  const employeesWithNoTasks = employeesWithTasks.filter(({ tasks }) => tasks.length === 0).length;
  
  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => addDays(prev, direction === 'next' ? 1 : -1));
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
      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[140px] justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {isSameDay(selectedDate, new Date()) 
                    ? t('common.today')
                    : isSameDay(selectedDate, addDays(new Date(), 1))
                    ? t('common.tomorrow')
                    : format(selectedDate, 'EEE, MMM d')
                  }
                </span>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs"
                onClick={() => setSelectedDate(startOfDay(new Date()))}
              >
                {t('common.today')}
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
                  <SelectItem value="all">{t('common.allLocations')}</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Summary */}
            <div className="flex items-center gap-3 ml-auto text-sm">
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {totalEmployees} {t('workforce.employees.label')}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                {totalTasks} {t('tasks.title')}
              </Badge>
              {employeesWithNoTasks > 0 && (
                <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  {employeesWithNoTasks} {t('tasks.withNoTasks', 'with no tasks')}
                </Badge>
              )}
              {totalOverdue > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {totalOverdue} {t('tasks.overdue')}
                </Badge>
              )}
              <Badge className="bg-green-100 text-green-800 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {totalCompleted} {t('tasks.completed')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Timeline Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary/80" />
          <span>{t('tasks.pending')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/80" />
          <span>{t('tasks.completed')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-destructive/80" />
          <span>{t('tasks.overdue')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-dashed border-primary bg-primary/20" />
          <span>{t('tasks.scheduled')}</span>
        </div>
      </div>
      
      {/* Employee Timeline Rows */}
      {scheduledEmployees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">{t('tasks.noEmployeesScheduled', 'No employees scheduled')}</p>
            <p className="text-sm mt-1">{t('tasks.selectDifferentDateOrLocation', 'Try selecting a different date or location')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {employeesWithTasks.map(({ employee, tasks: empTasks }) => (
            <ScheduledEmployeeRow
              key={employee.id}
              employee={employee}
              dayTasks={empTasks}
              selectedDate={selectedDate}
              onComplete={onComplete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};
