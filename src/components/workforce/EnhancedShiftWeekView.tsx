import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Plus, Settings, Calendar, Users, MapPin, TrendingUp, TrendingDown, Info, ArrowRightLeft, Palmtree, Clock, UserCheck, Send, Eye, EyeOff, LogIn, LogOut, Trash2, GraduationCap, Lock, ClipboardCheck, AlertCircle } from "lucide-react";
import { useShifts, useBulkPublishShifts } from "@/hooks/useShifts";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeOffRequests, useDeleteTimeOffRequest } from "@/hooks/useTimeOffRequests";
import { useLaborCosts } from "@/hooks/useLaborCosts";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { useDepartments } from "@/hooks/useDepartments";
import { useWeather } from "@/hooks/useWeather";
import { useAttendanceLogs } from "@/hooks/useAttendanceLogs";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isWithinInterval, parseISO } from "date-fns";
import { EnhancedShiftDialog } from "./EnhancedShiftDialog";
import { LocationScheduleDialog } from "./LocationScheduleDialog";
import { AddTimeOffDialog } from "./AddTimeOffDialog";
import { SchedulePresenceIndicator } from "./SchedulePresenceIndicator";
import { SchedulePeriodBanner } from "./SchedulePeriodBanner";
import { ChangeRequestDialog } from "./ChangeRequestDialog";
import { PendingApprovalsDialog } from "./PendingApprovalsDialog";
import { TrainingShiftCard } from "./TrainingShiftCard";
import { useLocations } from "@/hooks/useLocations";
import { useLocationSchedules } from "@/hooks/useLocationSchedules";
import { useSchedulePresence } from "@/hooks/useSchedulePresence";
import { useRealtimeShifts } from "@/hooks/useRealtimeShifts";
import { useScheduleGovernanceEnabled, useSchedulePeriod, useSchedulePeriodsForWeek, usePendingChangeRequests, useWorkforceExceptions } from "@/hooks/useScheduleGovernance";
import { useCompany } from "@/hooks/useCompany";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const EnhancedShiftWeekView = () => {
  const { t } = useTranslation();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false);
  const [selectedTimeOffEmployee, setSelectedTimeOffEmployee] = useState<string | undefined>();
  const [selectedTimeOffDate, setSelectedTimeOffDate] = useState<Date | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [hasAutoSelectedLocation, setHasAutoSelectedLocation] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [view, setView] = useState<"day" | "week">("week");
  const [viewMode, setViewMode] = useState<"employee" | "location">("employee");
  const [timeOffToDelete, setTimeOffToDelete] = useState<{ id: string; employeeName: string } | null>(null);
  const [shiftTypeFilter, setShiftTypeFilter] = useState<"all" | "regular" | "training">("all");
  const [changeRequestDialogOpen, setChangeRequestDialogOpen] = useState(false);
  const [pendingApprovalsOpen, setPendingApprovalsOpen] = useState(false);
  const [pendingApprovalsFilter, setPendingApprovalsFilter] = useState<{ periodId?: string; locationId?: string }>({});
  const [pendingChangeRequest, setPendingChangeRequest] = useState<{
    changeType: 'add' | 'edit' | 'delete';
    targetShiftId?: string;
    payloadBefore?: Record<string, any>;
    payloadAfter: Record<string, any>;
    shiftSummary?: string;
  } | null>(null);
  
  const deleteTimeOff = useDeleteTimeOffRequest();
  
  // Schedule governance hooks
  const { data: company } = useCompany();
  const isGovernanceEnabled = useScheduleGovernanceEnabled();
  
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  
  // Create a unique key for this week for presence tracking
  const weekKey = format(currentWeekStart, 'yyyy-MM-dd');
  
  // Enable realtime updates for shifts
  useRealtimeShifts();
  
  // Listen for 'open-pending-approvals' event from SchedulePeriodBanner
  useEffect(() => {
    const handleOpenPendingApprovals = (event: CustomEvent<{ periodId?: string; locationId?: string }>) => {
      setPendingApprovalsFilter(event.detail || {});
      setPendingApprovalsOpen(true);
    };
    
    window.addEventListener('open-pending-approvals', handleOpenPendingApprovals as EventListener);
    return () => {
      window.removeEventListener('open-pending-approvals', handleOpenPendingApprovals as EventListener);
    };
  }, []);
  
  // Track who else is viewing this schedule
  const { activeUsers } = useSchedulePresence(weekKey, selectedLocation === "all" ? undefined : selectedLocation);
  
  const { data: locations = [] } = useLocations();
  const { data: shifts = [], isLoading } = useShifts(
    selectedLocation === "all" ? undefined : selectedLocation,
    format(currentWeekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd'),
    shiftTypeFilter
  );
  // Always load ALL employees (no location filter) so that employee names
  // are correctly resolved for staff assigned to shifts across any location,
  // including draft/pending assignments where staff may be from a different location.
  const { data: employees = [] } = useEmployees(undefined, "active");
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
  
  // Fetch attendance logs for the week to show check-in/out indicators
  const { data: attendanceLogs = [] } = useAttendanceLogs(
    selectedLocation === "all" ? undefined : selectedLocation,
    format(currentWeekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );

  // Auto-select the first location that has scheduled shifts on initial load
  useEffect(() => {
    if (hasAutoSelectedLocation || isLoading || shifts.length === 0 || locations.length === 0) return;
    
    // Find unique location IDs from existing shifts
    const locationIdsWithShifts = [...new Set(shifts.map((s: any) => s.location_id))];
    
    // Find the first valid location that has shifts
    const firstLocationWithShifts = locations.find(l => locationIdsWithShifts.includes(l.id));
    
    if (firstLocationWithShifts) {
      setSelectedLocation(firstLocationWithShifts.id);
    }
    setHasAutoSelectedLocation(true);
  }, [hasAutoSelectedLocation, isLoading, shifts, locations]);

  // Schedule governance - get period for selected location (or all periods for aggregate view)
  const { data: schedulePeriod, isLoading: periodLoading } = useSchedulePeriod(
    selectedLocation !== "all" ? selectedLocation : null,
    currentWeekStart
  );
  const { data: allPeriods = [] } = useSchedulePeriodsForWeek(currentWeekStart);
  
  // Determine aggregate period state when "all locations" is selected
  const aggregatePeriodState = useMemo(() => {
    if (selectedLocation !== "all" || allPeriods.length === 0) return null;
    const states = new Set(allPeriods.map(p => p.state));
    if (states.size === 1) return Array.from(states)[0];
    return 'mixed'; // Different states across locations
  }, [selectedLocation, allPeriods]);
  
  // Pending governance items for combined count (only when governance enabled)
  const { data: pendingChangeRequests = [] } = usePendingChangeRequests(
    selectedLocation !== "all" ? schedulePeriod?.id : undefined
  );
  const { data: pendingExceptions = [] } = useWorkforceExceptions({
    status: 'pending',
    locationId: selectedLocation !== "all" ? selectedLocation : undefined
  });
  
  // Combined governance approvals count
  const governanceApprovalsCount = isGovernanceEnabled 
    ? pendingChangeRequests.length + pendingExceptions.length 
    : 0;
  
  // Check if the current period is locked (for mutation gating)
  const isPeriodLocked = schedulePeriod?.state === 'locked';
  const selectedLocationName = locations.find(l => l.id === selectedLocation)?.name;

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

  // Get attendance for a specific employee on a specific date
  const getAttendanceForEmployeeAndDate = (employeeId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendanceLogs.find(log => {
      if (log.staff_id !== employeeId) return false;
      const logDate = log.check_in_at.split('T')[0];
      return logDate === dateStr;
    });
  };

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Get unpublished shifts for a day
  const getUnpublishedShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(shift => shift.shift_date === dateStr && !shift.is_published);
  };

  // Get all unpublished shifts for the week (only future shifts, from today onwards)
  const unpublishedWeekShiftIds = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return shifts.filter(shift => !shift.is_published && shift.shift_date >= today).map(s => s.id);
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

  // Get unassigned draft shifts - shifts that exist but have no approved assignments
  // Also include published shifts that have pending assignments (not yet showing under any employee)
  const getUnassignedDraftShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(shift => 
      shift.shift_date === dateStr &&
      !shift.is_open_shift &&
      !shift.is_published &&
      (!shift.shift_assignments || shift.shift_assignments.filter((sa: any) => sa.approval_status === 'approved').length === 0)
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

  // Get shift count indicator for an employee
  const getShiftIndicator = (employee: any) => {
    if (!employee.expected_shifts_per_week) return null;
    
    const actual = getEmployeeShiftCountForWeek(employee.id);
    const expected = employee.expected_shifts_per_week;
    const diff = actual - expected;
    
    return { actual, expected, diff };
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
      {/* Schedule Governance Banner - only show when governance is enabled */}
      {isGovernanceEnabled && selectedLocation !== "all" && schedulePeriod && (
        <SchedulePeriodBanner
          period={schedulePeriod}
          isLoading={periodLoading}
          locationName={selectedLocationName}
          onViewChangeRequests={() => {
            // Open pending approvals dialog - wire to parent via state or navigation
            window.dispatchEvent(new CustomEvent('open-pending-approvals', { 
              detail: { periodId: schedulePeriod?.id, locationId: selectedLocation } 
            }));
          }}
        />
      )}
      
      {/* Aggregate state indicator when "All Locations" is selected */}
      {isGovernanceEnabled && selectedLocation === "all" && aggregatePeriodState && (
        <div className="rounded-lg border px-4 py-2 bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4" />
          {aggregatePeriodState === 'mixed' 
            ? 'Schedule periods have different states across locations. Select a specific location to manage.'
            : `All locations are in ${aggregatePeriodState} state.`
          }
        </div>
      )}
      {/* Header with week navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold min-w-[200px] text-center">
            {format(currentWeekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Presence indicator - show who else is viewing */}
          <SchedulePresenceIndicator activeUsers={activeUsers} locations={locations} />
          <Button variant="outline" onClick={goToToday}>
            {t('workforce.shifts.today')}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Shift Type Filter Chips */}
          <ToggleGroup type="single" value={shiftTypeFilter} onValueChange={(v) => v && setShiftTypeFilter(v as "all" | "regular" | "training")}>
            <ToggleGroupItem value="all" aria-label="All shifts" className="gap-1 text-xs px-2">
              {t('common.all', 'All')}
            </ToggleGroupItem>
            <ToggleGroupItem value="regular" aria-label="Regular shifts" className="gap-1 text-xs px-2">
              <Clock className="h-3 w-3" />
              {t('workforce.shifts.regular', 'Regular')}
            </ToggleGroupItem>
            <ToggleGroupItem value="training" aria-label="Training shifts" className="gap-1 text-xs px-2">
              <GraduationCap className="h-3 w-3" />
              {t('training.title', 'Training')}
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="h-6 w-px bg-border" />
          
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "employee" | "location")}>
            <ToggleGroupItem value="employee" aria-label={t('workforce.shifts.employeeView')} className="gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('workforce.shifts.employees')}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="location" aria-label={t('workforce.shifts.locationView')} className="gap-1">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">{t('workforce.shifts.locations')}</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('workforce.attendance.allLocations')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('workforce.attendance.allLocations')}</SelectItem>
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
              title={t('workforce.shifts.manageOperatingHours')}
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
                      <span className="hidden sm:inline">{t('workforce.shifts.publishWeek')}</span>
                      <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        {unpublishedWeekShiftIds.length}
                      </Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('workforce.shifts.publishAllShifts', { count: unpublishedWeekShiftIds.length })}</p>
                  </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Pending Approvals button - visible when governance enabled */}
          {isGovernanceEnabled && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setPendingApprovalsFilter({ 
                        periodId: schedulePeriod?.id, 
                        locationId: selectedLocation !== "all" ? selectedLocation : undefined 
                      });
                      setPendingApprovalsOpen(true);
                    }}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Approvals</span>
                    {governanceApprovalsCount > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5">
                        {governanceApprovalsCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View pending schedule changes and exceptions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedTimeOffEmployee(undefined);
              setSelectedTimeOffDate(undefined);
              setTimeOffDialogOpen(true);
            }} 
            className="gap-2"
          >
            <Palmtree className="h-4 w-4" />
            <span className="hidden sm:inline">{t('workforce.shifts.addTimeOff')}</span>
          </Button>

          <Button onClick={() => handleAddShift(new Date())} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('workforce.shifts.addShift')}
          </Button>
        </div>
      </div>
      
      {/* Locked schedule notice - show when period is locked */}
      {isGovernanceEnabled && isPeriodLocked && selectedLocation !== "all" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 text-sm">
          <Lock className="h-4 w-4 text-amber-600" />
          <span className="text-amber-800 dark:text-amber-200">
            <strong>Schedule locked</strong> — Edits will create change requests for manager approval
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-muted/50 rounded-lg border text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <Info className="h-3.5 w-3.5" />
          {t('workforce.shifts.legend')}:
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-primary/20 border border-primary" />
          <span>{t('workforce.shifts.published')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-primary/10 border border-dashed border-primary/40 opacity-50" />
          <span>{t('workforce.shifts.unpublished')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 flex items-center justify-center">
            <Palmtree className="h-2.5 w-2.5 text-red-500" />
          </div>
          <span>{t('workforce.shifts.timeOffVacation')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded border border-dashed border-orange-400 bg-orange-50 dark:bg-orange-900/20 opacity-70" />
          <span>{t('workforce.shifts.pendingApprovalLegend')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-green-600 text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 px-1 rounded">
            <TrendingUp className="h-3 w-3" />
            +N
          </span>
          <span>{t('workforce.shifts.extraShifts')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-orange-600 text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/30 px-1 rounded">
            <TrendingDown className="h-3 w-3" />
            -N
          </span>
          <span>{t('workforce.shifts.missingShifts')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-muted border border-border flex items-center justify-center">
            <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
          <span>{t('workforce.shifts.openShiftLegend')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-purple-100 dark:bg-purple-900/30 border-l-2 border-l-purple-500 flex items-center justify-center">
            <GraduationCap className="h-2.5 w-2.5 text-purple-600" />
          </div>
          <span>{t('training.shift', 'Training')}</span>
        </div>
      </div>

      {/* Week grid with employee rows */}
      <div className="border rounded-lg overflow-hidden bg-card max-h-[calc(100vh-280px)] overflow-y-auto">
        <div className="grid grid-cols-8 border-b sticky top-0 z-10 bg-card">
          <div className="p-3 border-r bg-muted/50 font-medium sticky left-0">
            {viewMode === "employee" ? t('workforce.shifts.employee') : t('workforce.shifts.locationHeader')}
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

        {/* Unassigned Draft Shifts Row */}
        {weekDays.some(day => getUnassignedDraftShiftsForDay(day).length > 0) && (
          <div className="grid grid-cols-8 border-b bg-orange-50/50 dark:bg-orange-950/20">
            <div className="p-3 border-r font-medium flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <EyeOff className="h-4 w-4" />
              <span className="text-sm">Draft (Unassigned)</span>
            </div>
            {weekDays.map((day) => {
              const draftShifts = getUnassignedDraftShiftsForDay(day);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <div key={day.toISOString()} className={`p-2 border-r last:border-r-0 ${isToday ? 'bg-primary/10 ring-1 ring-inset ring-primary/20' : ''}`}>
                  {draftShifts.map((shift) => (
                    <div
                      key={shift.id}
                      onClick={() => handleEditShift(shift)}
                      style={{
                        backgroundColor: `${getRoleColor(shift.role)}10`,
                        borderColor: `${getRoleColor(shift.role)}60`
                      }}
                      className="text-xs p-1.5 rounded border border-dashed cursor-pointer hover:shadow-md transition-shadow mb-1 opacity-70"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{shift.role}</div>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-orange-500 text-orange-500">
                          Draft
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                      </div>
                      {selectedLocation === "all" && shift.locations?.name && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          📍 {shift.locations.name}
                        </div>
                      )}
                      {(() => {
                        const pendingAssignments = (shift.shift_assignments || []).filter((a: any) => a.approval_status === 'pending');
                        if (pendingAssignments.length > 0) {
                          return (
                            <div className="mt-1 space-y-0.5">
                              {pendingAssignments.map((a: any) => {
                                const emp = employees.find(e => e.id === a.staff_id);
                                return (
                                  <div key={a.id} className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{emp?.full_name || t('common.unknown')}</span>
                                    <span className="text-[9px] opacity-75">– Pending</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        return (
                          <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            No staff assigned
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

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
                  <div className="p-3 border-r flex items-center gap-3 bg-background overflow-visible">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={employee.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {employee.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 overflow-visible">
                      <div className="font-medium text-sm flex items-center gap-1 flex-wrap">
                        <span className="truncate max-w-[120px]" title={employee.full_name}>{employee.full_name}</span>
                        {shiftIndicator && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 cursor-default ${
                                shiftIndicator.diff >= 0
                                  ? 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
                                  : 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400'
                              }`}>
                                {shiftIndicator.actual}/{shiftIndicator.expected}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {shiftIndicator.diff >= 0
                                  ? `All expected shifts scheduled${shiftIndicator.diff > 0 ? ` (+${shiftIndicator.diff} extra)` : ''}.`
                                  : `${shiftIndicator.actual} of ${shiftIndicator.expected} expected shifts scheduled. ${Math.abs(shiftIndicator.diff)} more needed.`}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{employee.role}</div>
                      {selectedLocation === "all" && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          📍 {employee.staff_locations && employee.staff_locations.length > 0 
                            ? `All Locations (${employee.staff_locations.length + 1})` 
                            : employee.locations?.name || 'No location'}
                        </div>
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
                        <div 
                          className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs p-1.5 rounded text-center cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors group relative"
                          onClick={() => setTimeOffToDelete({ id: timeOff.id, employeeName: employee.full_name })}
                          title="Click to remove time off"
                        >
                          <span className="capitalize">{timeOff.request_type || 'Time Off'}</span>
                          <Trash2 className="h-3 w-3 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        employeeShifts.map((shift) => {
                          const assignment = shift.shift_assignments?.find(
                            (sa: any) => sa.staff_id === employee.id
                          );
                          const isPending = assignment?.approval_status === 'pending';
                          const isUnpublished = !shift.is_published;
                          const attendance = getAttendanceForEmployeeAndDate(employee.id, day);
                          const isTrainingShift = shift.shift_type === 'training';
                          
                          // Determine if this is a "missing" shift: published, past end time, no attendance
                          const isMissing = (() => {
                            if (!shift.is_published || attendance || isPending || isUnpublished) return false;
                            const [endH, endM] = shift.end_time.split(':').map(Number);
                            const shiftEnd = new Date(shift.shift_date + 'T00:00:00');
                            shiftEnd.setHours(endH, endM, 0, 0);
                            return new Date() > shiftEnd;
                          })();
                          
                          // Use TrainingShiftCard for training shifts
                          if (isTrainingShift) {
                            return <TrainingShiftCard key={shift.id} shift={shift} compact />;
                          }
                          
                          return (
                            <div
                              key={shift.id}
                              onClick={() => handleEditShift(shift)}
                              style={{
                                backgroundColor: isMissing 
                                  ? 'hsl(var(--destructive) / 0.1)' 
                                  : isUnpublished ? `${getRoleColor(shift.role)}10` : `${getRoleColor(shift.role)}20`,
                                borderColor: isMissing 
                                  ? 'hsl(var(--destructive))' 
                                  : isUnpublished ? `${getRoleColor(shift.role)}60` : getRoleColor(shift.role)
                              }}
                              className={`text-xs p-1.5 rounded border cursor-pointer hover:shadow-md transition-shadow mb-1 ${
                                isPending ? 'opacity-60 border-dashed' : ''
                              } ${isUnpublished ? 'opacity-50 border-dashed' : ''} ${isMissing ? 'border-dashed border-2' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className={`font-medium ${isMissing ? 'text-destructive' : ''}`}>{shift.role}</div>
                                <div className="flex items-center gap-1">
                                  {isMissing && (
                                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                      Missing
                                    </Badge>
                                  )}
                                  {attendance && (
                                    <div className="flex items-center gap-0.5">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <LogIn className="h-3 w-3 text-green-600" />
                                        </TooltipTrigger>
                                        <TooltipContent>Checked in: {format(new Date(attendance.check_in_at), 'HH:mm')}</TooltipContent>
                                      </Tooltip>
                                      {attendance.check_out_at && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <LogOut className="h-3 w-3 text-blue-600" />
                                          </TooltipTrigger>
                                          <TooltipContent>Checked out: {format(new Date(attendance.check_out_at), 'HH:mm')}</TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  )}
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
                              </div>
                              <div className={`${isMissing ? 'text-destructive/70' : 'text-muted-foreground'}`}>
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
                    <div className="flex flex-wrap gap-0.5 items-center justify-center max-w-full">
                      {totalStaff > 0 ? (
                        <>
                          {Object.entries(roleCounts).map(([role, count]) => (
                            <Badge 
                              key={role} 
                              variant="secondary" 
                              className="text-[10px] font-medium px-1 py-0 shadow-sm border whitespace-nowrap"
                              style={{ 
                                backgroundColor: `${getRoleColor(role)}25`,
                                borderColor: `${getRoleColor(role)}50`,
                                color: getRoleColor(role)
                              }}
                            >
                              {count} {role}
                            </Badge>
                          ))}
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
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
                            const empAttendance = emp ? getAttendanceForEmployeeAndDate(emp.id, day) : null;
                            return emp ? (
                              <div key={sa.id} className="text-[11px] font-medium mt-1 flex items-center gap-1">
                                {emp.full_name}
                                {empAttendance && (
                                  <span className="flex items-center gap-0.5">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <LogIn className="h-3 w-3 text-green-600" />
                                      </TooltipTrigger>
                                      <TooltipContent>Checked in: {format(new Date(empAttendance.check_in_at), 'HH:mm')}</TooltipContent>
                                    </Tooltip>
                                    {empAttendance.check_out_at && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <LogOut className="h-3 w-3 text-blue-600" />
                                        </TooltipTrigger>
                                        <TooltipContent>Checked out: {format(new Date(empAttendance.check_out_at), 'HH:mm')}</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </span>
                                )}
                              </div>
                            ) : null;
                          })}
                          {assignedCount === 0 && (() => {
                            const pendingAssignments = shift.shift_assignments?.filter((sa: any) => sa.approval_status === 'pending') || [];
                            if (pendingAssignments.length > 0) {
                              return pendingAssignments.map((sa: any) => {
                                const emp = employees.find(e => e.id === sa.staff_id);
                                return (
                                  <div key={sa.id} className="text-[11px] font-medium mt-1 flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{emp?.full_name || t('common.unknown')}</span>
                                    <span className="text-[9px] opacity-75">– Pending</span>
                                  </div>
                                );
                              });
                            }
                            return <div className="text-[10px] text-muted-foreground italic mt-1">Unassigned</div>;
                          })()}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-left">
                    <p className="font-semibold mb-1">Labor Cost Calculation</p>
                    <ul className="text-xs space-y-1">
                      <li><strong>Cost:</strong> Sum of (shift hours × employee hourly rate) for all scheduled shifts</li>
                      <li><strong>%:</strong> Labor cost as percentage of projected sales (target: under 30%)</li>
                      <li><strong>Hours:</strong> Total scheduled hours for the day</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
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
        isPeriodLocked={isPeriodLocked}
        isGovernanceEnabled={isGovernanceEnabled}
        onLockedChangeRequest={(payload) => {
          setPendingChangeRequest(payload);
          setChangeRequestDialogOpen(true);
        }}
      />
      
      {selectedLocation !== "all" && (
        <LocationScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          locationId={selectedLocation}
        />
      )}

      <AddTimeOffDialog
        open={timeOffDialogOpen}
        onOpenChange={(open) => {
          setTimeOffDialogOpen(open);
          if (!open) {
            setSelectedTimeOffEmployee(undefined);
            setSelectedTimeOffDate(undefined);
          }
        }}
        employees={employees}
        defaultEmployeeId={selectedTimeOffEmployee}
        defaultDate={selectedTimeOffDate}
      />

      {/* Delete Time Off Confirmation Dialog */}
      <AlertDialog open={!!timeOffToDelete} onOpenChange={(open) => !open && setTimeOffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Time Off</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the time off for {timeOffToDelete?.employeeName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (timeOffToDelete) {
                  deleteTimeOff.mutate(timeOffToDelete.id);
                  setTimeOffToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Request Dialog for locked schedule edits */}
      {pendingChangeRequest && company?.id && selectedLocation !== "all" && schedulePeriod && (
        <ChangeRequestDialog
          open={changeRequestDialogOpen}
          onOpenChange={(open) => {
            setChangeRequestDialogOpen(open);
            if (!open) setPendingChangeRequest(null);
          }}
          changeType={pendingChangeRequest.changeType}
          companyId={company.id}
          locationId={selectedLocation}
          periodId={schedulePeriod.id}
          targetShiftId={pendingChangeRequest.targetShiftId}
          payloadBefore={pendingChangeRequest.payloadBefore}
          payloadAfter={pendingChangeRequest.payloadAfter}
          shiftSummary={pendingChangeRequest.shiftSummary}
        />
      )}
      
      {/* Pending Approvals Dialog */}
      <PendingApprovalsDialog
        open={pendingApprovalsOpen}
        onOpenChange={setPendingApprovalsOpen}
        filterPeriodId={pendingApprovalsFilter.periodId}
        filterLocationId={pendingApprovalsFilter.locationId}
      />
    </div>
  );
};