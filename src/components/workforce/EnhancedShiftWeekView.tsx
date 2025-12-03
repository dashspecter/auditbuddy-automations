import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Plus, Settings, Calendar, Users, MapPin } from "lucide-react";
import { useShifts } from "@/hooks/useShifts";
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
  const { data: weatherData, isLoading: weatherLoading, error: weatherError } = useWeather();
  const { data: departmentsList = [] } = useDepartments();

  console.log("Weather data:", weatherData, "Loading:", weatherLoading, "Error:", weatherError);

  const [weatherPopoverOpen, setWeatherPopoverOpen] = useState(false);
  const [selectedWeatherDate, setSelectedWeatherDate] = useState<string | null>(null);

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

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

  const getRoleColor = (roleName: string) => {
    const role = roles.find(r => r.name === roleName);
    return role?.color || "#6366f1";
  };

  const getLaborCostForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return laborCosts.find(lc => lc.date === dateStr);
  };

  const getOperatingHoursForDay = (date: Date) => {
    const dayOfWeek = (date.getDay() + 6) % 7;
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek);
    
    if (!schedule) return "24 Hours";
    if (schedule.is_closed) return "Closed";
    
    return `${schedule.open_time.slice(0, 5)} - ${schedule.close_time.slice(0, 5)}`;
  };

  // Get role counts for a specific day
  const getRoleCountsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(shift => shift.shift_date === dateStr && !shift.is_open_shift);
    
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

          <Button onClick={() => handleAddShift(new Date())} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Shift
          </Button>
        </div>
      </div>

      {/* Week grid with employee rows */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="grid grid-cols-8 border-b">
          <div className="p-3 border-r bg-muted/50 font-medium">
            {viewMode === "employee" ? "Employee" : "Location"}
          </div>
          {weekDays.map((day) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const weather = getWeatherForDay(day);
            const roleCounts = getRoleCountsForDay(day);
            const totalStaff = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);
            
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
                {/* Role count badges */}
                {totalStaff > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 justify-center">
                    {Object.entries(roleCounts).slice(0, 3).map(([role, count]) => (
                      <Badge 
                        key={role} 
                        variant="secondary" 
                        className="text-[10px] px-1 py-0"
                        style={{ backgroundColor: `${getRoleColor(role)}30` }}
                      >
                        {count} {role.length > 6 ? role.slice(0, 6) + '..' : role}
                      </Badge>
                    ))}
                    {Object.keys(roleCounts).length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        +{Object.keys(roleCounts).length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Open Shifts Row */}
        <div className="grid grid-cols-8 border-b bg-accent/5">
          <div className="p-3 border-r font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Open Shifts
          </div>
          {weekDays.map((day) => {
            const openShifts = getOpenShiftsForDay(day);
            return (
              <div key={day.toISOString()} className="p-2 border-r last:border-r-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-auto text-xs justify-start text-primary"
                  onClick={() => handleAddShift(day)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
                {openShifts.map((shift) => (
                  <div
                    key={shift.id}
                    onClick={() => handleEditShift(shift)}
                    style={{
                      backgroundColor: `${getRoleColor(shift.role)}20`,
                      borderColor: getRoleColor(shift.role)
                    }}
                    className="text-xs p-1.5 rounded border cursor-pointer hover:shadow-md transition-shadow mb-1"
                  >
                    <div className="font-medium">{shift.role}</div>
                    <div className="text-muted-foreground">
                      {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                    </div>
                    {selectedLocation === "all" && shift.locations?.name && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        📍 {shift.locations.name}
                      </div>
                    )}
                  </div>
                ))}
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
            {employeesByDepartment[department].map((employee) => (
              <div key={employee.id} className="grid grid-cols-8 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                <div className="p-3 border-r flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={employee.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {employee.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{employee.full_name}</div>
                    <div className="text-xs text-muted-foreground">{employee.role}</div>
                    {selectedLocation === "all" && employee.locations?.name && (
                      <div className="text-[10px] text-muted-foreground truncate">📍 {employee.locations.name}</div>
                    )}
                  </div>
                </div>
                {weekDays.map((day) => {
                  const employeeShifts = getShiftsForEmployeeAndDay(employee.id, day);
                  const timeOff = getTimeOffForEmployeeAndDay(employee.id, day);
                  
                  return (
                    <div key={day.toISOString()} className="p-2 border-r last:border-r-0 min-h-[80px]">
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
                          
                          return (
                            <div
                              key={shift.id}
                              onClick={() => handleEditShift(shift)}
                              style={{
                                backgroundColor: `${getRoleColor(shift.role)}20`,
                                borderColor: getRoleColor(shift.role)
                              }}
                              className={`text-xs p-1.5 rounded border cursor-pointer hover:shadow-md transition-shadow mb-1 ${
                                isPending ? 'opacity-60 border-dashed' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{shift.role}</div>
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
            ))}
          </div>
        ))}

        {/* Location Rows */}
        {viewMode === "location" && (selectedLocation === "all" ? locations : locations.filter(l => l.id === selectedLocation)).map((location) => (
          <div key={location.id}>
            {/* Location Header */}
            <div className="grid grid-cols-8 bg-muted/50 border-b">
              <div className="col-span-8 p-2 font-semibold text-sm flex items-center gap-2">
                <MapPin className="h-3 w-3 text-primary" />
                {location.name}
              </div>
            </div>
            
            {/* Shifts row for this location */}
            <div className="grid grid-cols-8 border-b hover:bg-muted/30 transition-colors">
              <div className="p-3 border-r text-xs text-muted-foreground">
                All shifts
              </div>
              {weekDays.map((day) => {
                const locationShifts = getShiftsForLocationAndDay(location.id, day);
                
                return (
                  <div key={day.toISOString()} className="p-2 border-r last:border-r-0 min-h-[80px]">
                    {locationShifts.map((shift) => {
                      const approvedAssignments = shift.shift_assignments?.filter(
                        (sa: any) => sa.approval_status === 'approved'
                      ) || [];
                      const assignedCount = approvedAssignments.length;
                      
                      return (
                        <div
                          key={shift.id}
                          onClick={() => handleEditShift(shift)}
                          style={{
                            backgroundColor: `${getRoleColor(shift.role)}20`,
                            borderColor: getRoleColor(shift.role)
                          }}
                          className="text-xs p-1.5 rounded border cursor-pointer hover:shadow-md transition-shadow mb-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{shift.role}</div>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {assignedCount}/{shift.staff_needed || 1}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground">
                            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                          </div>
                          {approvedAssignments.length > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-1 truncate">
                              {approvedAssignments.map((sa: any) => {
                                const emp = employees.find(e => e.id === sa.staff_id);
                                return emp?.full_name?.split(' ')[0];
                              }).filter(Boolean).join(', ')}
                            </div>
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
          const laborCost = getLaborCostForDay(day);
          const laborPercentage = laborCost && laborCost.projected_sales > 0
            ? ((laborCost.scheduled_cost / laborCost.projected_sales) * 100).toFixed(2)
            : "0.00";
          
          return (
            <Card key={day.toISOString()} className="p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <span>Labor</span>
              </div>
              <div className="text-sm font-medium">
                {laborCost?.scheduled_cost.toFixed(2) || "0.00"} Lei
              </div>
              <div className={`text-xs ${parseFloat(laborPercentage) > 30 ? 'text-red-500' : 'text-green-500'}`}>
                {laborPercentage}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {laborCost?.scheduled_hours.toFixed(1) || "0.0"} hrs
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