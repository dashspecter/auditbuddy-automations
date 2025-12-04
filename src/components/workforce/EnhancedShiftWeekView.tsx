import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Plus, Settings, Calendar, Users, MapPin, TrendingUp, TrendingDown, Info, ArrowRightLeft, Palmtree, Clock, UserCheck, Send, Eye, EyeOff } from "lucide-react";
import { useShifts, useBulkPublishShifts } from "@/hooks/useShifts";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeOffRequests } from "@/hooks/useTimeOffRequests";
import { useLaborCosts } from "@/hooks/useLaborCosts";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { useDepartments } from "@/hooks/useDepartments";
import { useWeather } from "@/hooks/useWeather";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isWithinInterval, parseISO } from "date-fns";
import { EnhancedShiftDialog } from "./EnhancedShiftDialog";
import { LocationScheduleDialog } from "./LocationScheduleDialog";
import { useLocations } from "@/hooks/useLocations";
import { useLocationSchedules } from "@/hooks/useLocationSchedules";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const EnhancedShiftWeekView = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [view, setView] = useState<"day" | "week">("week");
  const [viewMode, setViewMode] = useState<"employee" | "location">("employee");
  
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  
  const { data: locations = [] } = useLocations();
  const { data: shifts = [], isLoading } = useShifts(
    selectedLocation === "all" ? undefined : selectedLocation,
    format(currentWeekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );
  const { data: employees = [] } = useEmployees(selectedLocation === "all" ? undefined : selectedLocation);
  const { data: timeOffRequests = [] } = useTimeOffRequests(
    format(currentWeekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );
  const { data: laborCosts = [] } = useLaborCosts(
    selectedLocation === "all" ? undefined : selectedLocation,
    format(currentWeekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );
  const { data: roles = [] } = useEmployeeRoles();
  const { data: schedules = [] } = useLocationSchedules(selectedLocation === "all" ? undefined : selectedLocation);
  const { data: allSchedules = [] } = useLocationSchedules(undefined, true); // Fetch all schedules for all locations
  const { data: departmentsList = [] } = useDepartments();
  const bulkPublish = useBulkPublishShifts();

  // Get selected location's coordinates for weather
  const selectedLocationData = selectedLocation !== "all" 
    ? locations.find(l => l.id === selectedLocation) 
    : locations[0]; // Use first location if "all" selected
  
  const { data: weatherData, isLoading: weatherLoading, error: weatherError } = useWeather(
    (selectedLocationData as any)?.latitude,
    (selectedLocationData as any)?.longitude
  );

  const [weatherPopoverOpen, setWeatherPopoverOpen] = useState(false);
  const [selectedWeatherDate, setSelectedWeatherDate] = useState<string | null>(null);

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Get unpublished shifts for a day
  const getUnpublishedShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(shift => shift.shift_date === dateStr && !shift.is_published);
  };

  // Get all unpublished shifts for the week
  const unpublishedWeekShiftIds = useMemo(() => {
    return shifts.filter(shift => !shift.is_published).map(s => s.id);
  }, [shifts]);

  // Publish all shifts for a specific day
  const handlePublishDay = (date: Date) => {
    const unpublishedIds = getUnpublishedShiftsForDay(date).map(s => s.id);
    if (unpublishedIds.length > 0) {
      bulkPublish.mutate({ shiftIds: unpublishedIds, publish: true });
    }
  };

  // Publish all shifts for the week
  const handlePublishWeek = () => {
    if (unpublishedWeekShiftIds.length > 0) {
      bulkPublish.mutate({ shiftIds: unpublishedWeekShiftIds, publish: true });
    }
  };

  // Group employees by department based on their role
  const employeesByDepartment = employees.reduce((acc, employee) => {
    const role = roles.find(r => r.name === employee.role);
    const departmentId = role?.department_id;
    const department = departmentsList.find(d => d.id === departmentId);
    const departmentName = department?.name || 'General';
    
    if (!acc[departmentName]) {
      acc[departmentName] = [];
    }
    acc[departmentName].push(employee);
    return acc;
  }, {} as Record<string, typeof employees>);

  const departments = Object.keys(employeesByDepartment).sort();

  const getShiftsForEmployeeAndDay = (employeeId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(shift => 
      shift.shift_date === dateStr &&
      shift.shift_assignments?.some((sa: any) => 
        sa.staff_id === employeeId && sa.approval_status === 'approved'
      )
    );
  };

  const getOpenShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(shift => 
      shift.shift_date === dateStr &&
      shift.is_open_shift
    );
  };

  const getTimeOffForEmployeeAndDay = (employeeId: string, date: Date) => {
    return timeOffRequests.find(req =>
      req.employee_id === employeeId &&
      isWithinInterval(date, {
        start: parseISO(req.start_date),
        end: parseISO(req.end_date)
      }) &&
      req.status === "approved"
    );
  };

  // Calculate shift count for an employee for the current week
  const getEmployeeShiftCountForWeek = (employeeId: string) => {
    let count = 0;
    weekDays.forEach(day => {
      const dayShifts = getShiftsForEmployeeAndDay(employeeId, day);
      count += dayShifts.length;
    });
    return count;
  };

  // Get extra/missing shifts indicator for an employee
  const getShiftIndicator = (employee: any) => {
    if (!employee.expected_shifts_per_week) return null;
    
    const actualShifts = getEmployeeShiftCountForWeek(employee.id);
    const diff = actualShifts - employee.expected_shifts_per_week;
    
    if (diff > 0) {
      return { type: 'extra', count: diff };
    } else if (diff < 0) {
      return { type: 'missing', count: Math.abs(diff) };
    }
    return null;
  };

  const getRoleColor = (roleName: string) => {
    const role = roles.find(r => r.name === roleName);
    return role?.color || "#6366f1";
  };

  const calculateLaborCostForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(shift => 
      shift.shift_date === dateStr && !shift.is_open_shift
    );
    
    let totalHours = 0;
    let totalCost = 0;
    
    dayShifts.forEach(shift => {
      const approvedAssignments = shift.shift_assignments?.filter(
        (sa: any) => sa.approval_status === 'approved'
      ) || [];
      
      if (approvedAssignments.length > 0) {
        // Calculate shift duration in hours
        const [startH, startM] = shift.start_time.split(':').map(Number);
        const [endH, endM] = shift.end_time.split(':').map(Number);
        let hours = (endH + endM / 60) - (startH + startM / 60);
        if (hours < 0) hours += 24; // Handle overnight shifts
        
        approvedAssignments.forEach((sa: any) => {
          const employee = employees.find(e => e.id === sa.staff_id);
          const hourlyRate = employee?.hourly_rate || 0;
          totalHours += hours;
          totalCost += hours * hourlyRate;
        });
      }
    });
    
    // Check stored labor costs for projected/actual sales
    const storedCost = laborCosts.find(lc => lc.date === dateStr);
    
    return {
      scheduled_hours: totalHours,
      scheduled_cost: totalCost,
      projected_sales: storedCost?.projected_sales || 0,
      actual_sales: storedCost?.actual_sales || 0
    };
  };

  const getOperatingHoursForDay = (date: Date) => {
    const dayOfWeek = (date.getDay() + 6) % 7;
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek);
    
    if (!schedule) return "24 Hours";
    if (schedule.is_closed) return "Closed";
    
    return `${schedule.open_time.slice(0, 5)} - ${schedule.close_time.slice(0, 5)}`;
  };

  const getOperatingHoursForLocationAndDay = (locationId: string, date: Date) => {
    const dayOfWeek = (date.getDay() + 6) % 7;
    const schedule = allSchedules.find(s => s.location_id === locationId && s.day_of_week === dayOfWeek);
    
    if (!schedule) return null;
    if (schedule.is_closed) return "Closed";
    
    return `${schedule.open_time.slice(0, 5)} - ${schedule.close_time.slice(0, 5)}`;
  };

  // Get role counts for a specific location and day
  const getRoleCountsForLocationAndDay = (locationId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(shift => 
      shift.shift_date === dateStr && 
      !shift.is_open_shift && 
      shift.location_id === locationId
    );
    
    const roleCounts: Record<string, number> = {};
    dayShifts.forEach(shift => {
      const approvedAssignments = shift.shift_assignments?.filter(
        (sa: any) => sa.approval_status === 'approved'
      ) || [];
      if (approvedAssignments.length > 0) {
        roleCounts[shift.role] = (roleCounts[shift.role] || 0) + approvedAssignments.length;
      }
    });
    
    return roleCounts;
  };

  // Group shifts by location
  const shiftsByLocation = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    locations.forEach(loc => {
      grouped[loc.id] = shifts.filter(shift => shift.location_id === loc.id);
    });
    return grouped;
  }, [shifts, locations]);

  const getShiftsForLocationAndDay = (locationId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return (shiftsByLocation[locationId] || []).filter(
      shift => shift.shift_date === dateStr && !shift.is_open_shift
    );
  };

  const getWeatherForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return weatherData?.daily?.find(w => w.date === dateStr);
  };

  const getHourlyWeatherForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return weatherData?.hourly?.[dateStr] || [];
  };

  const handleAddShift = (date: Date) => {
    setSelectedDate(date);
    setSelectedShift(null);
    setShiftDialogOpen(true);
  };

  const handleEditShift = (shift: any) => {
    setSelectedShift(shift);
    setShiftDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold min-w-[200px] text-center">
            {format(currentWeekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "employee" | "location")}>
            <ToggleGroupItem value="employee" aria-label="Employee view" className="gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Employees</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="location" aria-label="Location view" className="gap-1">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Locations</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedLocation !== "all" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScheduleDialogOpen(true)}
              title="Manage Operating Hours"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}

          {unpublishedWeekShiftIds.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="gap-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                    onClick={handlePublishWeek}
                    disabled={bulkPublish.isPending}
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Publish Week</span>
                    <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {unpublishedWeekShiftIds.length}
                    </Badge>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Publish all {unpublishedWeekShiftIds.length} unpublished shifts for this week</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <Button onClick={() => handleAddShift(new Date())} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Shift
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-muted/50 rounded-lg border text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <Info className="h-3.5 w-3.5" />
          Legend:
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-primary/20 border border-primary" />
          <span>Published</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-primary/10 border border-dashed border-primary/40 opacity-50" />
          <span>Unpublished (Draft)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 flex items-center justify-center">
            <Palmtree className="h-2.5 w-2.5 text-red-500" />
          </div>
          <span>Time Off / Vacation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded border border-dashed border-orange-400 bg-orange-50 dark:bg-orange-900/20 opacity-70" />
          <span>Pending Approval</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-green-600 text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 px-1 rounded">
            <TrendingUp className="h-3 w-3" />
            +N
          </span>
          <span>Extra Shifts</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-orange-600 text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/30 px-1 rounded">
            <TrendingDown className="h-3 w-3" />
            -N
          </span>
          <span>Missing Shifts</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-muted border border-border flex items-center justify-center">
            <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
          <span>Open Shift</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Close</Badge>
          <span>Closing Duty</span>
        </div>
      </div>

      {/* Week grid with employee rows */}
      <div className="border rounded-lg overflow-hidden bg-card max-h-[calc(100vh-280px)] overflow-y-auto">
        <div className="grid grid-cols-8 border-b sticky top-0 z-10 bg-card">
          <div className="p-3 border-r bg-muted/50 font-medium sticky left-0">
            {viewMode === "employee" ? "Employee" : "Location"}
          </div>
          {weekDays.map((day) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const weather = getWeatherForDay(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`p-3 border-r last:border-r-0 text-center ${
                  isToday ? 'bg-primary/10' : isWeekend ? 'bg-muted/30' : ''
                }`}
              >
                <div className="font-medium">{format(day, 'EEE')}</div>
                <div className="text-sm text-muted-foreground">{format(day, 'MMM d')}</div>
                {weather && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button 
                        className="text-lg my-1 cursor-pointer hover:scale-110 transition-transform" 
                        title={`${weather.description} - Click for hourly forecast`}
                      >
                        {weather.icon} {weather.temperature}°C
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-3">
                        <div className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">{weather.icon}</span>
                          <div>
                            <div>{format(day, 'EEEE, MMM d')}</div>
                            <div className="text-sm text-muted-foreground font-normal">{weather.description}</div>
                          </div>
                        </div>
                        <ScrollArea className="h-[300px] pr-4">
                          <div className="space-y-2">
                            {getHourlyWeatherForDay(day).map((hourly, idx) => (
                              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium w-12">{hourly.time.slice(0, 5)}</span>
                                  <span className="text-xl">{hourly.icon}</span>
                                  <span className="text-xs text-muted-foreground">{hourly.description}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {hourly.precipitation > 0 && (
                                    <span className="text-xs text-blue-500">💧 {hourly.precipitation}mm</span>
                                  )}
                                  <span className="text-sm font-medium">{hourly.temperature}°C</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <div className="text-xs text-muted-foreground mt-1">{getOperatingHoursForDay(day)}</div>
                {/* Publish day button */}
                {getUnpublishedShiftsForDay(day).length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 mt-1 text-[10px] text-green-600 hover:bg-green-50 dark:hover:bg-green-950 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublishDay(day);
                          }}
                          disabled={bulkPublish.isPending}
                        >
                          <Send className="h-3 w-3" />
                          Publish ({getUnpublishedShiftsForDay(day).length})
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Publish {getUnpublishedShiftsForDay(day).length} draft shift(s) for {format(day, 'EEEE')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          })}
        </div>

        {/* Open Shifts Row */}
        <div className="grid grid-cols-8 border-b bg-muted/60">
          <div className="p-3 border-r font-medium flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Open Shifts
          </div>
          {weekDays.map((day) => {
            const openShifts = getOpenShiftsForDay(day);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            return (
              <div key={day.toISOString()} className={`p-2 border-r last:border-r-0 ${isToday ? 'bg-primary/10 ring-1 ring-inset ring-primary/20' : ''}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-auto text-xs justify-start text-primary"
                  onClick={() => handleAddShift(day)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
                {openShifts.map((shift) => {
                  const isUnpublished = !shift.is_published;
                  return (
                    <div
                      key={shift.id}
                      onClick={() => handleEditShift(shift)}
                      style={{
                        backgroundColor: isUnpublished ? `${getRoleColor(shift.role)}10` : `${getRoleColor(shift.role)}20`,
                        borderColor: isUnpublished ? `${getRoleColor(shift.role)}60` : getRoleColor(shift.role)
                      }}
                      className={`text-xs p-1.5 rounded border cursor-pointer hover:shadow-md transition-shadow mb-1 ${
                        isUnpublished ? 'opacity-50 border-dashed' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{shift.role}</div>
                        {isUnpublished && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-muted-foreground/50 text-muted-foreground">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                      </div>
                      {selectedLocation === "all" && shift.locations?.name && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          📍 {shift.locations.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Employee Rows - Grouped by Department */}
        {viewMode === "employee" && departments.map((department) => (
          <div key={department}>
            {/* Department Header */}
            <div className="grid grid-cols-8 bg-muted/50 border-b">
              <div className="col-span-8 p-2 font-semibold text-sm flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                {department}
              </div>
            </div>
            
            {/* Employees in this department */}
            {employeesByDepartment[department].map((employee) => {
              const shiftIndicator = getShiftIndicator(employee);
              
              return (
                <div key={employee.id} className="grid grid-cols-8 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <div className="p-3 border-r flex items-center gap-3 bg-background">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={employee.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {employee.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate flex items-center gap-1">
                        {employee.full_name}
                        {shiftIndicator?.type === 'extra' && (
                          <span className="inline-flex items-center gap-0.5 text-green-600 text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 px-1 rounded" title={`+${shiftIndicator.count} extra shifts this week`}>
                            <TrendingUp className="h-3 w-3" />
                            +{shiftIndicator.count}
                          </span>
                        )}
                        {shiftIndicator?.type === 'missing' && (
                          <span className="inline-flex items-center gap-0.5 text-orange-600 text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/30 px-1 rounded" title={`-${shiftIndicator.count} shifts below expected this week`}>
                            <TrendingDown className="h-3 w-3" />
                            -{shiftIndicator.count}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{employee.role}</div>
                      {selectedLocation === "all" && employee.locations?.name && (
                        <div className="text-[10px] text-muted-foreground truncate">📍 {employee.locations.name}</div>
                      )}
                    </div>
                  </div>
                {weekDays.map((day) => {
                  const employeeShifts = getShiftsForEmployeeAndDay(employee.id, day);
                  const timeOff = getTimeOffForEmployeeAndDay(employee.id, day);
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  
                  return (
                    <div key={day.toISOString()} className={`p-2 border-r last:border-r-0 min-h-[80px] ${isToday ? 'bg-primary/10 ring-1 ring-inset ring-primary/20' : ''}`}>
                      {timeOff ? (
                        <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs p-1.5 rounded text-center">
                          TIME OFF
                        </div>
                      ) : (
                        employeeShifts.map((shift) => {
                          const assignment = shift.shift_assignments?.find(
                            (sa: any) => sa.staff_id === employee.id
                          );
                          const isPending = assignment?.approval_status === 'pending';
                          const isUnpublished = !shift.is_published;
                          
                          return (
                            <div
                              key={shift.id}
                              onClick={() => handleEditShift(shift)}
                              style={{
                                backgroundColor: isUnpublished ? `${getRoleColor(shift.role)}10` : `${getRoleColor(shift.role)}20`,
                                borderColor: isUnpublished ? `${getRoleColor(shift.role)}60` : getRoleColor(shift.role)
                              }}
                              className={`text-xs p-1.5 rounded border cursor-pointer hover:shadow-md transition-shadow mb-1 ${
                                isPending ? 'opacity-60 border-dashed' : ''
                              } ${isUnpublished ? 'opacity-50 border-dashed' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{shift.role}</div>
                                {isUnpublished && !isPending && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-muted-foreground/50 text-muted-foreground">
                                    Draft
                                  </Badge>
                                )}
                                {isPending && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-orange-500 text-orange-500">
                                    Pending
                                  </Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground">
                                {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                              </div>
                              {selectedLocation === "all" && shift.locations?.name && (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  📍 {shift.locations.name}
                                </div>
                              )}
                              {shift.close_duty && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">Close</Badge>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
              );
            })}
          </div>
        ))}

        {/* Location Rows */}
        {viewMode === "location" && (selectedLocation === "all" ? locations : locations.filter(l => l.id === selectedLocation)).map((location) => (
          <div key={location.id} className="border-t-2 border-border first:border-t-0">
            {/* Location Header with role badges per day */}
            <div className="grid grid-cols-8 bg-primary/5 dark:bg-primary/10 border-b-2 border-primary/20">
              <div className="p-3 font-semibold text-sm flex items-center gap-2 border-r bg-primary/10 dark:bg-primary/15">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-foreground">{location.name}</span>
              </div>
              {weekDays.map((day) => {
                const roleCounts = getRoleCountsForLocationAndDay(location.id, day);
                const totalStaff = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const operatingHours = getOperatingHoursForLocationAndDay(location.id, day);
                
                return (
                  <div key={day.toISOString()} className={`p-2 border-r last:border-r-0 flex flex-col items-center justify-center gap-1 ${isToday ? 'bg-primary/10 ring-1 ring-inset ring-primary/20' : ''}`}>
                    {operatingHours && (
                      <div className={`text-[10px] font-medium ${operatingHours === 'Closed' ? 'text-red-500' : 'text-muted-foreground'}`}>
                        🕐 {operatingHours}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 items-center justify-center">
                      {totalStaff > 0 ? (
                        <>
                          {Object.entries(roleCounts).slice(0, 3).map(([role, count]) => (
                            <Badge 
                              key={role} 
                              variant="secondary" 
                              className="text-xs font-semibold px-2 py-0.5 shadow-sm border"
                              style={{ 
                                backgroundColor: `${getRoleColor(role)}25`,
                                borderColor: `${getRoleColor(role)}50`,
                                color: getRoleColor(role)
                              }}
                            >
                              {count} {role.length > 7 ? role.slice(0, 6) + '..' : role}
                            </Badge>
                          ))}
                          {Object.keys(roleCounts).length > 3 && (
                            <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
                              +{Object.keys(roleCounts).length - 3}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Shifts row for this location */}
            <div className="grid grid-cols-8 border-b hover:bg-muted/30 transition-colors">
              <div className="p-3 border-r text-xs text-muted-foreground">
                All shifts
              </div>
              {weekDays.map((day) => {
                const locationShifts = getShiftsForLocationAndDay(location.id, day);
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                
                return (
                  <div key={day.toISOString()} className={`p-2 border-r last:border-r-0 min-h-[80px] ${isToday ? 'bg-primary/10 ring-1 ring-inset ring-primary/20' : ''}`}>
                    {locationShifts.map((shift) => {
                      const approvedAssignments = shift.shift_assignments?.filter(
                        (sa: any) => sa.approval_status === 'approved'
                      ) || [];
                      const assignedCount = approvedAssignments.length;
                      const isUnpublished = !shift.is_published;
                      
                      return (
                        <div
                          key={shift.id}
                          onClick={() => handleEditShift(shift)}
                          style={{
                            backgroundColor: isUnpublished ? `${getRoleColor(shift.role)}10` : `${getRoleColor(shift.role)}20`,
                            borderColor: isUnpublished ? `${getRoleColor(shift.role)}60` : getRoleColor(shift.role)
                          }}
                          className={`text-xs p-1.5 rounded border cursor-pointer hover:shadow-md transition-shadow mb-1 ${
                            isUnpublished ? 'opacity-50 border-dashed' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{shift.role}</div>
                            <div className="flex items-center gap-1">
                              {isUnpublished && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-muted-foreground/50 text-muted-foreground">
                                  Draft
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                {assignedCount}/{shift.staff_needed || 1}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                          </div>
                          {approvedAssignments.map((sa: any) => {
                            const emp = employees.find(e => e.id === sa.staff_id);
                            return emp ? (
                              <div key={sa.id} className="text-[11px] font-medium mt-1">
                                {emp.full_name}
                              </div>
                            ) : null;
                          })}
                          {assignedCount === 0 && (
                            <div className="text-[10px] text-muted-foreground italic mt-1">Unassigned</div>
                          )}
                        </div>
                      );
                    })}
                    {locationShifts.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-2">No shifts</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Labor Cost Summary */}
      <div className="grid grid-cols-8 gap-2">
        <div className="col-span-1" />
        {weekDays.map((day) => {
          const laborCost = calculateLaborCostForDay(day);
          const laborPercentage = laborCost.projected_sales > 0
            ? ((laborCost.scheduled_cost / laborCost.projected_sales) * 100).toFixed(2)
            : "0.00";
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          
          return (
            <Card key={day.toISOString()} className={`p-2 text-center ${isToday ? 'ring-2 ring-primary/40 bg-primary/5' : ''}`}>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <span>Labor</span>
              </div>
              <div className="text-sm font-medium">
                {laborCost.scheduled_cost.toFixed(2)} Lei
              </div>
              <div className={`text-xs ${parseFloat(laborPercentage) > 30 ? 'text-red-500' : 'text-green-500'}`}>
                {laborPercentage}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {laborCost.scheduled_hours.toFixed(1)} hrs
              </div>
            </Card>
          );
        })}
      </div>

      <EnhancedShiftDialog 
        open={shiftDialogOpen} 
        onOpenChange={(open) => {
          setShiftDialogOpen(open);
          if (!open) {
            setSelectedShift(null);
            setSelectedDate(undefined);
          }
        }}
        shift={selectedShift}
        defaultDate={selectedDate}
      />
      
      {selectedLocation !== "all" && (
        <LocationScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          locationId={selectedLocation}
        />
      )}
    </div>
  );
};