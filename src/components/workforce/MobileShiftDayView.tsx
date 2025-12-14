import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Users, Clock, Plus, Palmtree, TrendingUp, TrendingDown } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval, parseISO } from "date-fns";
import { useShifts } from "@/hooks/useShifts";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeOffRequests } from "@/hooks/useTimeOffRequests";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { useDepartments } from "@/hooks/useDepartments";
import { useLocations } from "@/hooks/useLocations";
import { useLocationSchedules } from "@/hooks/useLocationSchedules";
import { EnhancedShiftDialog } from "./EnhancedShiftDialog";

interface MobileShiftDayViewProps {
  onShiftClick?: (shift: any) => void;
}

export const MobileShiftDayView = ({ onShiftClick }: MobileShiftDayViewProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedShift, setSelectedShift] = useState<any>(null);
  
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
  const { data: roles = [] } = useEmployeeRoles();
  const { data: schedules = [] } = useLocationSchedules(selectedLocation === "all" ? undefined : selectedLocation);
  const { data: departmentsList = [] } = useDepartments();

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(shift => 
      shift.shift_date === dateStr && !shift.is_open_shift
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

  const getOperatingHoursForDay = (date: Date) => {
    const dayOfWeek = (date.getDay() + 6) % 7;
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek);
    
    if (!schedule) return "24 Hours";
    if (schedule.is_closed) return "Closed";
    
    return `${schedule.open_time.slice(0, 5)} - ${schedule.close_time.slice(0, 5)}`;
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
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground rounded-lg p-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousWeek}
            className="text-primary-foreground hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="font-medium text-sm">
              {format(currentWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextWeek}
            className="text-primary-foreground hover:bg-white/20"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-primary-foreground hover:bg-white/20 text-xs"
          >
            Today
          </Button>
        </div>

        {/* Location Selector */}
        <div className="mt-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="bg-white/10 border-white/20 text-primary-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <SelectValue placeholder="Select location" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Daily Shifts */}
      <div className="space-y-4">
        {weekDays.map((day) => {
          const dayShifts = getShiftsForDay(day);
          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
          
          // Group shifts by assigned employees
          const shiftsWithAssignments: { shift: any; employee: any; assignment: any }[] = [];
          dayShifts.forEach(shift => {
            const approvedAssignments = shift.shift_assignments?.filter(
              (sa: any) => sa.approval_status === 'approved'
            ) || [];
            
            if (approvedAssignments.length > 0) {
              approvedAssignments.forEach((assignment: any) => {
                const employee = employees.find(e => e.id === assignment.staff_id);
                shiftsWithAssignments.push({ shift, employee, assignment });
              });
            } else {
              shiftsWithAssignments.push({ shift, employee: null, assignment: null });
            }
          });

          return (
            <div 
              key={day.toString()} 
              className={`rounded-lg ${isToday ? "bg-primary/5 border border-primary/20" : "bg-card border"}`}
            >
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "EEE, MMM d")}
                    </span>
                    {isToday && (
                      <Badge variant="default" className="text-xs">Today</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {shiftsWithAssignments.length}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getOperatingHoursForDay(day)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 space-y-2">
                {shiftsWithAssignments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">No shifts scheduled</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddShift(day)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Shift
                    </Button>
                  </div>
                ) : (
                  <>
                    {shiftsWithAssignments.map(({ shift, employee, assignment }, idx) => {
                      const isUnpublished = !shift.is_published;
                      const isPending = assignment?.approval_status === 'pending';
                      const hasTimeOff = employee ? getTimeOffForEmployeeAndDay(employee.id, day) : null;
                      
                      return (
                        <Card
                          key={`${shift.id}-${idx}`}
                          className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
                            isUnpublished ? 'opacity-60 border-dashed' : ''
                          }`}
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: getRoleColor(shift.role)
                          }}
                          onClick={() => handleEditShift(shift)}
                        >
                          <div className="flex items-center gap-3">
                            {employee ? (
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={employee.avatar_url || undefined} />
                                <AvatarFallback className="text-sm font-semibold">
                                  {employee.full_name?.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm truncate">
                                  {employee?.full_name || 'Unassigned'}
                                </span>
                                {hasTimeOff && (
                                  <Badge variant="destructive" className="text-xs gap-1">
                                    <Palmtree className="h-3 w-3" />
                                    Off
                                  </Badge>
                                )}
                                {isPending && (
                                  <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">
                                    Pending
                                  </Badge>
                                )}
                                {isUnpublished && (
                                  <Badge variant="secondary" className="text-xs">
                                    Draft
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs font-normal"
                                  style={{ borderColor: getRoleColor(shift.role), color: getRoleColor(shift.role) }}
                                >
                                  {shift.role}
                                </Badge>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                </span>
                              </div>
                              {selectedLocation === "all" && shift.locations?.name && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {shift.locations.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => handleAddShift(day)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Shift
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <EnhancedShiftDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        defaultDate={selectedDate}
        shift={selectedShift}
      />
    </div>
  );
};
