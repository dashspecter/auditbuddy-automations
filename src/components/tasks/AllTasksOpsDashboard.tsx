import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  MapPin, 
  Calendar, 
  Users, 
  Filter, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Timer
} from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { useLocations } from "@/hooks/useLocations";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { useEmployees } from "@/hooks/useEmployees";
import { Checkbox } from "@/components/ui/checkbox";
import { format, startOfWeek, endOfWeek, addWeeks, getDay, startOfDay, endOfDay, addDays } from "date-fns";
import { 
  isTaskOverdue, 
  getOccurrencesForDate,
  getTaskDate,
  getTaskDeadline,
  isVirtualId,
} from "@/lib/taskOccurrenceEngine";

// Group mode types
type GroupMode = "location-day" | "day-location" | "role" | "flat";
type DateRange = "this-week" | "next-week" | "this-month" | "custom";
type StatusFilter = "all" | "pending" | "overdue" | "completed";

interface AllTasksOpsDashboardProps {
  tasks: Task[];
  onComplete: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  isLoading?: boolean;
}

// Day names for grouping
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Mini task card for grouped display
const TaskCard = ({ 
  task, 
  onComplete, 
  onEdit,
  compact = false 
}: { 
  task: Task; 
  onComplete: () => void;
  onEdit: () => void;
  compact?: boolean;
}) => {
  const { t } = useTranslation();
  const isVirtual = isVirtualId(task.id);
  const overdue = isTaskOverdue(task);
  const isRecurring = task.recurrence_type && task.recurrence_type !== "none";
  const taskDate = getTaskDate(task);
  
  return (
    <div 
      className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/5 transition-colors ${
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
          {isRecurring && <RefreshCw className="h-3 w-3 text-primary shrink-0" />}
          {overdue && task.status !== "completed" && (
            <Badge variant="destructive" className="text-xs">{t('tasks.overdue')}</Badge>
          )}
          {task.status === "completed" && task.completed_late && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">{t('tasks.late')}</Badge>
          )}
        </div>
        {!compact && (
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {task.assigned_employee && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {task.assigned_employee.full_name}
              </span>
            )}
            {task.assigned_role && !task.assigned_employee && (
              <span className="flex items-center gap-1 text-primary">
                <Users className="h-3 w-3" />
                {task.assigned_role.name}
              </span>
            )}
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
          </div>
        )}
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

// Group header with stats
const GroupHeader = ({ 
  title, 
  icon: Icon, 
  tasks, 
  isOpen, 
  onToggle 
}: { 
  title: string; 
  icon: React.ElementType;
  tasks: Task[]; 
  isOpen: boolean; 
  onToggle: () => void;
}) => {
  const pending = tasks.filter(t => t.status !== "completed" && !isTaskOverdue(t)).length;
  const overdue = tasks.filter(t => isTaskOverdue(t)).length;
  const completed = tasks.filter(t => t.status === "completed").length;
  
  return (
    <div 
      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{title}</span>
        <Badge variant="outline" className="ml-1">{tasks.length}</Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          {overdue > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {overdue}
            </span>
          )}
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {pending}
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            {completed}
          </span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
    </div>
  );
};

// Nested group for day under location
const DayGroup = ({ 
  dayName, 
  tasks, 
  onComplete, 
  onEdit,
  defaultOpen = false 
}: { 
  dayName: string; 
  tasks: Task[];
  onComplete: (id: string) => void;
  onEdit: (id: string) => void;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  if (tasks.length === 0) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-2 pl-6 hover:bg-accent/5 rounded cursor-pointer">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{dayName}</span>
            <Badge variant="outline" className="text-xs">{tasks.length}</Badge>
          </div>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-8 space-y-2 mt-2">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onComplete={() => onComplete(task.id)}
            onEdit={() => onEdit(task.id)}
            compact
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const AllTasksOpsDashboard = ({
  tasks,
  onComplete,
  onEdit,
  onDelete,
  isLoading
}: AllTasksOpsDashboardProps) => {
  const { t } = useTranslation();
  const { data: locations = [] } = useLocations();
  const { data: roles = [] } = useEmployeeRoles();
  const { data: employees = [] } = useEmployees();

  // State
  const [groupMode, setGroupMode] = useState<GroupMode>("location-day");
  const [dateRange, setDateRange] = useState<DateRange>("this-week");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Calculate date range
  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = startOfDay(new Date());
    switch (dateRange) {
      case "this-week":
        return { 
          rangeStart: startOfWeek(today, { weekStartsOn: 1 }), 
          rangeEnd: endOfWeek(today, { weekStartsOn: 1 }) 
        };
      case "next-week":
        const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
        return { 
          rangeStart: nextWeekStart, 
          rangeEnd: endOfWeek(nextWeekStart, { weekStartsOn: 1 }) 
        };
      case "this-month":
        return { 
          rangeStart: today, 
          rangeEnd: addDays(today, 30) 
        };
      default:
        return { rangeStart: today, rangeEnd: addDays(today, 7) };
    }
  }, [dateRange]);

  // Get all occurrences in range
  const occurrencesInRange = useMemo(() => {
    const allOccurrences: Task[] = [];
    const seenIds = new Set<string>();
    
    // Iterate each day in range and collect occurrences
    let currentDate = rangeStart;
    while (currentDate <= rangeEnd) {
      const dayOccurrences = getOccurrencesForDate(tasks, currentDate, { includeCompleted: true });
      
      for (const occ of dayOccurrences) {
        if (!seenIds.has(occ.id)) {
          seenIds.add(occ.id);
          allOccurrences.push(occ);
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    return allOccurrences;
  }, [tasks, rangeStart, rangeEnd]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    let result = occurrencesInRange;
    
    // Status filter
    if (statusFilter === "pending") {
      result = result.filter(t => t.status !== "completed" && !isTaskOverdue(t));
    } else if (statusFilter === "overdue") {
      result = result.filter(t => isTaskOverdue(t));
    } else if (statusFilter === "completed") {
      result = result.filter(t => t.status === "completed");
    }
    
    // Location filter
    if (locationFilter !== "all") {
      result = result.filter(t => t.location_id === locationFilter);
    }
    
    // Role filter
    if (roleFilter !== "all") {
      result = result.filter(t => t.assigned_role_id === roleFilter);
    }
    
    // Recurring only
    if (recurringOnly) {
      result = result.filter(t => t.recurrence_type && t.recurrence_type !== "none");
    }
    
    return result;
  }, [occurrencesInRange, statusFilter, locationFilter, roleFilter, recurringOnly]);

  // Group tasks
  const groupedData = useMemo(() => {
    if (groupMode === "flat") {
      return { flat: filteredTasks };
    }
    
    if (groupMode === "location-day") {
      // Group by location, then by day of week
      const byLocation: Record<string, { location: { id: string; name: string; isGlobal: boolean }; byDay: Record<number, Task[]> }> = {};
      
      for (const task of filteredTasks) {
        const locId = task.location_id || "global-company";
        const isGlobal = !task.location_id;
        const locName = task.location?.name || t('common.globalCompany', 'Global (Company)');
        
        if (!byLocation[locId]) {
          byLocation[locId] = { 
            location: { id: locId, name: locName, isGlobal }, 
            byDay: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } 
          };
        }
        
        const taskDate = getTaskDate(task);
        const dayOfWeek = taskDate ? getDay(taskDate) : 0;
        byLocation[locId].byDay[dayOfWeek].push(task);
      }
      
      return { locationDay: byLocation };
    }
    
    if (groupMode === "day-location") {
      // Group by day of week, then by location
      const byDay: Record<number, { byLocation: Record<string, Task[]> }> = {
        0: { byLocation: {} }, 1: { byLocation: {} }, 2: { byLocation: {} },
        3: { byLocation: {} }, 4: { byLocation: {} }, 5: { byLocation: {} }, 6: { byLocation: {} }
      };
      
      for (const task of filteredTasks) {
        const taskDate = getTaskDate(task);
        const dayOfWeek = taskDate ? getDay(taskDate) : 0;
        const locId = task.location_id || "global-company";
        
        if (!byDay[dayOfWeek].byLocation[locId]) {
          byDay[dayOfWeek].byLocation[locId] = [];
        }
        byDay[dayOfWeek].byLocation[locId].push(task);
      }
      
      return { dayLocation: byDay };
    }
    
    if (groupMode === "role") {
      // Group by role
      const byRole: Record<string, { role: { id: string; name: string }; tasks: Task[] }> = {};
      
      for (const task of filteredTasks) {
        const roleId = task.assigned_role_id || "no-role";
        const roleName = task.assigned_role?.name || (task.assigned_employee ? "Direct Assignment" : t('common.unassigned'));
        
        if (!byRole[roleId]) {
          byRole[roleId] = { role: { id: roleId, name: roleName }, tasks: [] };
        }
        byRole[roleId].tasks.push(task);
      }
      
      return { role: byRole };
    }
    
    return { flat: filteredTasks };
  }, [filteredTasks, groupMode, t]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setLocationFilter("all");
    setRoleFilter("all");
    setRecurringOnly(false);
  };

  const hasActiveFilters = statusFilter !== "all" || locationFilter !== "all" || roleFilter !== "all" || recurringOnly;

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
          <div className="flex flex-wrap gap-3">
            {/* Group Mode */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('common.groupBy')}</label>
              <Select value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location-day">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {t('common.location')} → {t('common.day')}
                    </span>
                  </SelectItem>
                  <SelectItem value="day-location">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {t('common.day')} → {t('common.location')}
                    </span>
                  </SelectItem>
                  <SelectItem value="role">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {t('common.role')}
                    </span>
                  </SelectItem>
                  <SelectItem value="flat">{t('common.flatList')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('common.dateRange')}</label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-week">{t('common.thisWeek')}</SelectItem>
                  <SelectItem value="next-week">{t('common.nextWeek')}</SelectItem>
                  <SelectItem value="this-month">{t('common.next30Days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('common.status')}</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="pending">{t('tasks.pending')}</SelectItem>
                  <SelectItem value="overdue">{t('tasks.overdue')}</SelectItem>
                  <SelectItem value="completed">{t('tasks.completed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('common.location')}</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('common.allLocations')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allLocations')}</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('common.role')}</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('common.allRoles')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allRoles')}</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recurring Toggle */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">&nbsp;</label>
              <Button
                variant={recurringOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setRecurringOnly(!recurringOnly)}
                className="h-10"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                {t('tasks.recurringOnly')}
              </Button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">&nbsp;</label>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
                  <X className="h-3.5 w-3.5 mr-1" />
                  {t('common.clearFilters')}
                </Button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
            <span>
              {format(rangeStart, "MMM d")} - {format(rangeEnd, "MMM d, yyyy")}
            </span>
            <span className="font-medium text-foreground">
              {filteredTasks.length} {t('tasks.title').toLowerCase()}
            </span>
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {filteredTasks.filter(t => isTaskOverdue(t)).length} {t('tasks.overdue').toLowerCase()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Content */}
      <div className="space-y-3">
        {/* Location → Day grouping */}
        {groupedData.locationDay && Object.entries(groupedData.locationDay).map(([locId, data]) => {
          const allTasks = Object.values(data.byDay).flat();
          if (allTasks.length === 0) return null;
          
          const isOpen = openGroups[locId] !== false; // Default open
          
          return (
            <Card key={locId}>
              <Collapsible open={isOpen} onOpenChange={() => toggleGroup(locId)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <GroupHeader 
                      title={data.location.name} 
                      icon={MapPin}
                      tasks={allTasks}
                      isOpen={isOpen}
                      onToggle={() => toggleGroup(locId)}
                    />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    {/* Monday first (index 1), then rest of week */}
                    {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => (
                      <DayGroup
                        key={dayIndex}
                        dayName={DAY_NAMES[dayIndex]}
                        tasks={data.byDay[dayIndex]}
                        onComplete={onComplete}
                        onEdit={onEdit}
                        defaultOpen={dayIndex === new Date().getDay()}
                      />
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {/* Day → Location grouping */}
        {groupedData.dayLocation && [1, 2, 3, 4, 5, 6, 0].map(dayIndex => {
          const dayData = groupedData.dayLocation[dayIndex];
          const allTasks = Object.values(dayData.byLocation).flat();
          if (allTasks.length === 0) return null;
          
          const isOpen = openGroups[`day-${dayIndex}`] !== false;
          
          return (
            <Card key={dayIndex}>
              <Collapsible open={isOpen} onOpenChange={() => toggleGroup(`day-${dayIndex}`)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <GroupHeader 
                      title={DAY_NAMES[dayIndex]} 
                      icon={Calendar}
                      tasks={allTasks}
                      isOpen={isOpen}
                      onToggle={() => toggleGroup(`day-${dayIndex}`)}
                    />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-3">
                    {Object.entries(dayData.byLocation).map(([locId, locTasks]) => {
                      if (locTasks.length === 0) return null;
                      const isGlobal = locId === "global-company";
                      const locName = isGlobal 
                        ? t('common.globalCompany', 'Global (Company)')
                        : (locTasks[0]?.location?.name || t('common.globalCompany', 'Global (Company)'));
                      
                      return (
                        <div key={locId} className="space-y-2">
                          <div className={`flex items-center gap-2 text-sm font-medium pl-2 ${isGlobal ? 'text-primary' : 'text-muted-foreground'}`}>
                            <MapPin className="h-3.5 w-3.5" />
                            {locName}
                            <Badge variant={isGlobal ? "default" : "outline"} className="text-xs">{locTasks.length}</Badge>
                          </div>
                          <div className="space-y-2 pl-4">
                            {locTasks.map(task => (
                              <TaskCard 
                                key={task.id} 
                                task={task} 
                                onComplete={() => onComplete(task.id)}
                                onEdit={() => onEdit(task.id)}
                                compact
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {/* Role grouping */}
        {groupedData.role && Object.entries(groupedData.role).map(([roleId, data]) => {
          if (data.tasks.length === 0) return null;
          
          const isOpen = openGroups[roleId] !== false;
          
          return (
            <Card key={roleId}>
              <Collapsible open={isOpen} onOpenChange={() => toggleGroup(roleId)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <GroupHeader 
                      title={data.role.name} 
                      icon={Users}
                      tasks={data.tasks}
                      isOpen={isOpen}
                      onToggle={() => toggleGroup(roleId)}
                    />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    {data.tasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onComplete={() => onComplete(task.id)}
                        onEdit={() => onEdit(task.id)}
                      />
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {/* Flat list */}
        {groupedData.flat && (
          <Card>
            <CardContent className="pt-4 space-y-2">
              {groupedData.flat.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('tasks.noTasksFound')}
                </div>
              ) : (
                groupedData.flat.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onComplete={() => onComplete(task.id)}
                    onEdit={() => onEdit(task.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
