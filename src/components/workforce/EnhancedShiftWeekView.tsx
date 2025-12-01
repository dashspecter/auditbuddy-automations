import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Plus, Settings, Calendar, DollarSign } from "lucide-react";
import { useShifts } from "@/hooks/useShifts";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeOffRequests } from "@/hooks/useTimeOffRequests";
import { useLaborCosts } from "@/hooks/useLaborCosts";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
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

export const EnhancedShiftWeekView = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [view, setView] = useState<"day" | "week">("week");
  
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

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getShiftsForEmployeeAndDay = (employeeId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(shift => 
      shift.shift_date === dateStr &&
      shift.shift_assignments?.some((sa: any) => sa.employee_id === employeeId)
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
          <div className="p-3 border-r bg-muted/50 font-medium">Employee</div>
          {weekDays.map((day) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            
            return (
              <div
                key={day.toISOString()}
                className={`p-3 border-r last:border-r-0 text-center ${
                  isToday ? 'bg-primary/10' : isWeekend ? 'bg-muted/30' : ''
                }`}
              >
                <div className="font-medium">{format(day, 'EEE')}</div>
                <div className="text-sm text-muted-foreground">{format(day, 'MMM d')}</div>
                <div className="text-xs text-muted-foreground mt-1">{getOperatingHoursForDay(day)}</div>
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
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Employee Rows */}
        {employees.map((employee) => (
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
                    employeeShifts.map((shift) => (
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
                        {shift.close_duty && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">Close</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
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
                <DollarSign className="h-3 w-3" />
                <span>Labor</span>
              </div>
              <div className="text-sm font-medium">
                ${laborCost?.scheduled_cost.toFixed(2) || "0.00"}
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