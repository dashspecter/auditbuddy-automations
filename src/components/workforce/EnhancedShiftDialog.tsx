import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, X, Clock, AlertTriangle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCreateShift, useUpdateShift, useDeleteShift } from "@/hooks/useShifts";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { useLocations } from "@/hooks/useLocations";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateShiftAssignment } from "@/hooks/useShiftAssignments";
import { useLocationOperatingSchedules } from "@/hooks/useLocationOperatingSchedules";
import { useShiftPresets } from "@/hooks/useShiftPresets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface EnhancedShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: any;
  defaultDate?: Date;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const EnhancedShiftDialog = ({
  open,
  onOpenChange,
  shift,
  defaultDate,
}: EnhancedShiftDialogProps) => {
  const [formData, setFormData] = useState({
    location_id: "",
    shift_date: "",
    start_time: "",
    end_time: "",
    role: "",
    required_count: "1",
    notes: "",
    is_open_shift: false,
    is_published: false,
    close_duty: false,
    break_duration_minutes: "0",
  });
  const [breaks, setBreaks] = useState<Array<{ start: string; end: string }>>([]);
  const [applyToDays, setApplyToDays] = useState<number[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [allowCrossDepartment, setAllowCrossDepartment] = useState(false);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [individualTimes, setIndividualTimes] = useState<Record<string, { start_time: string; end_time: string }>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [individualPresets, setIndividualPresets] = useState<Record<string, string>>({});

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const createAssignment = useCreateShiftAssignment();
  const { data: roles = [] } = useEmployeeRoles();
  const { data: locations = [] } = useLocations();
  const { data: employees = [] } = useEmployees(showAllLocations ? undefined : (formData.location_id || undefined));
  const { data: operatingSchedules = [] } = useLocationOperatingSchedules(formData.location_id);
  const { data: shiftPresets = [] } = useShiftPresets();

  // Fetch existing shift assignments for the selected date to filter out unavailable employees
  const { data: existingAssignments = [] } = useQuery({
    queryKey: ["shift-assignments-for-date", formData.shift_date, shift?.id],
    queryFn: async () => {
      if (!formData.shift_date) return [];
      
      let query = supabase
        .from("shift_assignments")
        .select(`
          staff_id,
          shift_id,
          shifts!inner(id, shift_date, start_time, end_time)
        `)
        .eq("shifts.shift_date", formData.shift_date)
        .neq("approval_status", "rejected");
      
      // When editing an existing shift, exclude assignments for THIS shift
      if (shift?.id) {
        query = query.neq("shift_id", shift.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.shift_date,
  });

  // Check which employees have existing shifts on this date (for warning display)
  const employeeShiftInfo = useMemo(() => {
    const info: Record<string, { hasShift: boolean; hasConflict: boolean; shiftTimes?: string }> = {};
    
    if (!formData.shift_date) {
      return info;
    }

    const normalizeTime = (time: string) => {
      if (time.length === 5) return `${time}:00`;
      return time;
    };

    const newStart = formData.start_time ? normalizeTime(formData.start_time) : null;
    const newEnd = formData.end_time ? normalizeTime(formData.end_time) : null;

    employees.forEach(employee => {
      const employeeAssignments = existingAssignments.filter((a: any) => a.staff_id === employee.id);
      
      if (employeeAssignments.length > 0) {
        const shiftTimes = employeeAssignments
          .map((a: any) => `${a.shifts.start_time.slice(0, 5)}-${a.shifts.end_time.slice(0, 5)}`)
          .join(', ');
        
        // Check for time overlap if we have the new shift times
        let hasConflict = false;
        if (newStart && newEnd) {
          hasConflict = employeeAssignments.some((assignment: any) => {
            const existingStart = normalizeTime(assignment.shifts.start_time);
            const existingEnd = normalizeTime(assignment.shifts.end_time);
            
            return (
              (newStart >= existingStart && newStart < existingEnd) ||
              (newEnd > existingStart && newEnd <= existingEnd) ||
              (newStart <= existingStart && newEnd >= existingEnd)
            );
          });
        }
        
        info[employee.id] = { hasShift: true, hasConflict, shiftTimes };
      } else {
        info[employee.id] = { hasShift: false, hasConflict: false };
      }
    });
    
    return info;
  }, [employees, existingAssignments, formData.start_time, formData.end_time, formData.shift_date]);

  // Keep all employees visible (removed filtering)
  const availableEmployees = employees;

  const operatingHoursInfo = useMemo(() => {
    if (!formData.location_id || !formData.shift_date || operatingSchedules.length === 0) {
      return null;
    }

    const shiftDate = new Date(formData.shift_date + 'T00:00:00');
    const dayOfWeek = (shiftDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    const schedule = operatingSchedules.find(s => s.day_of_week === dayOfWeek);

    if (!schedule) return null;
    if (schedule.is_closed) {
      return { isClosed: true };
    }

    return {
      isClosed: false,
      openTime: schedule.open_time,
      closeTime: schedule.close_time,
    };
  }, [formData.location_id, formData.shift_date, operatingSchedules]);

  const shiftValidation = useMemo(() => {
    if (!operatingHoursInfo || operatingHoursInfo.isClosed || !formData.start_time || !formData.end_time) {
      return null;
    }

    const { openTime, closeTime } = operatingHoursInfo;
    
    // Normalize all times to HH:MM:SS format for consistent comparison
    const normalizeTime = (time: string) => {
      if (time.length === 5) return `${time}:00`; // HH:MM -> HH:MM:00
      return time;
    };
    
    const shiftStart = normalizeTime(formData.start_time);
    const shiftEnd = normalizeTime(formData.end_time);
    const openTimeNormalized = normalizeTime(openTime);
    const closeTimeNormalized = normalizeTime(closeTime);
    
    // 00:00:00 close time means midnight (end of day), treat it as 24:00
    const isMidnightClose = closeTimeNormalized === "00:00:00";
    const isOvernightOperation = !isMidnightClose && closeTimeNormalized < openTimeNormalized;
    
    let isOutsideHours = false;
    
    if (isOvernightOperation) {
      // For overnight operations (e.g., 18:00 - 02:00):
      if (shiftStart >= openTimeNormalized) {
        // Daytime shift - end time can be up to midnight
        isOutsideHours = false;
      } else if (shiftEnd <= closeTimeNormalized) {
        // Early morning shift - before close time
        isOutsideHours = false;
      } else {
        isOutsideHours = true;
      }
    } else {
      // Normal same-day hours (including midnight close): shift must be within open-close range
      // Treat 00:00:00 as end of day (effectively 24:00)
      const effectiveCloseTime = isMidnightClose ? "24:00:00" : closeTimeNormalized;
      isOutsideHours = shiftStart < openTimeNormalized || shiftEnd > effectiveCloseTime;
    }

    return {
      isValid: !isOutsideHours,
      message: isOutsideHours
        ? `Shift times (${formData.start_time} - ${formData.end_time}) are outside operating hours (${openTime} - ${closeTime})`
        : null,
    };
  }, [operatingHoursInfo, formData.start_time, formData.end_time]);

  useEffect(() => {
    if (shift) {
      setFormData({
        location_id: shift.location_id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        role: shift.role,
        required_count: shift.required_count.toString(),
        notes: shift.notes || "",
        is_open_shift: shift.is_open_shift || false,
        is_published: shift.is_published || false,
        close_duty: shift.close_duty || false,
        break_duration_minutes: (shift.break_duration_minutes || 0).toString(),
      });
      setBreaks(shift.breaks || []);
      setSelectedEmployees(shift.shift_assignments?.map((sa: any) => sa.staff_id) || []);
    } else {
      const dateStr = defaultDate ? format(defaultDate, 'yyyy-MM-dd') : "";
      setFormData({
        location_id: "",
        shift_date: dateStr,
        start_time: "09:00",
        end_time: "17:00",
        role: "",
        required_count: "1",
        notes: "",
        is_open_shift: false,
        is_published: false,
        close_duty: false,
        break_duration_minutes: "0",
      });
      setBreaks([]);
      setApplyToDays([]);
      setSelectedEmployees([]);
      setAllowCrossDepartment(false);
      setBatchMode(false);
      setIndividualTimes({});
      setSelectedPreset("custom");
      setIndividualPresets({});
    }
  }, [shift, defaultDate, open]);

  const handleAddBreak = () => {
    setBreaks([...breaks, { start: "12:00", end: "12:30" }]);
  };

  const handleRemoveBreak = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    if (presetName && presetName !== "custom") {
      const preset = shiftPresets.find(p => p.name === presetName);
      if (preset) {
        setFormData({
          ...formData,
          start_time: preset.start_time,
          end_time: preset.end_time,
        });
        
        // Update individual times in batch mode
        if (batchMode) {
          const updatedTimes = { ...individualTimes };
          selectedEmployees.forEach(empId => {
            updatedTimes[empId] = {
              start_time: preset.start_time,
              end_time: preset.end_time,
            };
          });
          setIndividualTimes(updatedTimes);
        }
      }
    }
  };

  const handleBreakChange = (index: number, field: "start" | "end", value: string) => {
    const newBreaks = [...breaks];
    newBreaks[index][field] = value;
    setBreaks(newBreaks);
  };

  const toggleApplyDay = (dayIndex: number) => {
    if (applyToDays.includes(dayIndex)) {
      setApplyToDays(applyToDays.filter(d => d !== dayIndex));
    } else {
      setApplyToDays([...applyToDays, dayIndex]);
    }
  };

  const handleDelete = async () => {
    if (shift && window.confirm("Are you sure you want to delete this shift?")) {
      await deleteShift.mutateAsync(shift.id);
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (shift) {
      // Update existing shift
      const submitData = {
        ...formData,
        required_count: parseInt(formData.required_count),
        break_duration_minutes: parseInt(formData.break_duration_minutes),
        notes: formData.notes || null,
        breaks: breaks,
      };
      await updateShift.mutateAsync({ id: shift.id, ...submitData });
      
      // Handle assignment changes
      const existingAssignedIds = shift.shift_assignments?.map((sa: any) => sa.staff_id) || [];
      const newlySelectedIds = selectedEmployees;
      
      // Find employees to add (in new selection but not in existing)
      const toAdd = newlySelectedIds.filter((id: string) => !existingAssignedIds.includes(id));
      
      // Create new assignments
      for (const employeeId of toAdd) {
        await createAssignment.mutateAsync({
          shift_id: shift.id,
          employee_id: employeeId,
        });
      }
      
      onOpenChange(false);
    } else if (batchMode && selectedEmployees.length > 0) {
      // Batch mode: Create individual shifts for each employee
      for (const employeeId of selectedEmployees) {
        const employeeTimes = individualTimes[employeeId] || {
          start_time: formData.start_time,
          end_time: formData.end_time,
        };
        
        const shiftData = {
          ...formData,
          start_time: employeeTimes.start_time,
          end_time: employeeTimes.end_time,
          required_count: 1, // Each shift is for one employee
          break_duration_minutes: parseInt(formData.break_duration_minutes),
          notes: formData.notes || null,
          breaks: breaks,
        };
        
        // Create shift for this employee
        const newShift = await createShift.mutateAsync(shiftData);
        
        // Assign the employee to their shift
        if (newShift) {
          await createAssignment.mutateAsync({
            shift_id: newShift.id,
            employee_id: employeeId,
          });
        }
        
        // If apply to multiple days is selected
        if (applyToDays.length > 0) {
          const currentDate = new Date(formData.shift_date);
          const currentDayOfWeek = (currentDate.getDay() + 6) % 7;
          
          for (const dayIndex of applyToDays) {
            if (dayIndex !== currentDayOfWeek) {
              const daysToAdd = dayIndex - currentDayOfWeek;
              const newDate = new Date(currentDate);
              newDate.setDate(newDate.getDate() + daysToAdd);
              
              const additionalShift = await createShift.mutateAsync({
                ...shiftData,
                shift_date: format(newDate, 'yyyy-MM-dd'),
              });
              
              if (additionalShift) {
                await createAssignment.mutateAsync({
                  shift_id: additionalShift.id,
                  employee_id: employeeId,
                });
              }
            }
          }
        }
      }
      
      onOpenChange(false);
    } else {
      // Regular mode: Create one shift with multiple assignments
      const submitData = {
        ...formData,
        required_count: parseInt(formData.required_count),
        break_duration_minutes: parseInt(formData.break_duration_minutes),
        notes: formData.notes || null,
        breaks: breaks,
      };

      const newShift = await createShift.mutateAsync(submitData);
      
      // Assign selected employees to the shift
      if (newShift && selectedEmployees.length > 0) {
        for (const employeeId of selectedEmployees) {
          await createAssignment.mutateAsync({
            shift_id: newShift.id,
            employee_id: employeeId,
          });
        }
      }
      
      // If apply to multiple days is selected, create shifts for those days too
      if (applyToDays.length > 0) {
        const currentDate = new Date(formData.shift_date);
        const currentDayOfWeek = (currentDate.getDay() + 6) % 7;
        
        for (const dayIndex of applyToDays) {
          if (dayIndex !== currentDayOfWeek) {
            const daysToAdd = dayIndex - currentDayOfWeek;
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + daysToAdd);
            
            const additionalShift = await createShift.mutateAsync({
              ...submitData,
              shift_date: format(newDate, 'yyyy-MM-dd'),
            });
            
            if (additionalShift && selectedEmployees.length > 0) {
              for (const employeeId of selectedEmployees) {
                await createAssignment.mutateAsync({
                  shift_id: additionalShift.id,
                  employee_id: employeeId,
                });
              }
            }
          }
        }
      }
      
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {shift ? "Edit Shift" : "Create Shift"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location *</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, location_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.shift_date}
                onChange={(e) =>
                  setFormData({ ...formData, shift_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="required_count">
                Staff Needed for this Role *
                {formData.role && (
                  <span className="text-xs text-muted-foreground block mt-1">
                    Total {roles.find(r => r.name === formData.role)?.name || 'staff'} positions needed
                  </span>
                )}
              </Label>
              <Input
                type="number"
                min="1"
                value={formData.required_count}
                onChange={(e) =>
                  setFormData({ ...formData, required_count: e.target.value })
                }
                required
                placeholder="e.g., 3"
              />
            </div>
          </div>

          {/* Shift Preset Selector */}
          <div className="space-y-2">
            <Label>Shift Preset (Optional)</Label>
            <Select
              value={selectedPreset || "custom"}
              onValueChange={handlePresetChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a preset or set times manually" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Times</SelectItem>
                {shiftPresets.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name} ({preset.start_time} - {preset.end_time})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => {
                  setFormData({ ...formData, start_time: e.target.value });
                  setSelectedPreset("custom"); // Clear preset when manually editing
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => {
                  setFormData({ ...formData, end_time: e.target.value });
                  setSelectedPreset("custom"); // Clear preset when manually editing
                }}
                required
              />
            </div>
          </div>

          {/* Breaks Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Breaks</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBreak}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Break
              </Button>
            </div>
            {breaks.map((breakItem, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="time"
                  value={breakItem.start}
                  onChange={(e) => handleBreakChange(index, "start", e.target.value)}
                  className="flex-1"
                />
                <span>to</span>
                <Input
                  type="time"
                  value={breakItem.end}
                  onChange={(e) => handleBreakChange(index, "end", e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveBreak(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Operating Hours Info */}
          {operatingHoursInfo && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {operatingHoursInfo.isClosed ? (
                  <span className="text-destructive font-medium">
                    Location is closed on this day
                  </span>
                ) : (
                  <span>
                    Operating hours: {operatingHoursInfo.openTime} - {operatingHoursInfo.closeTime}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Shift Validation Warning */}
          {shiftValidation && !shiftValidation.isValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{shiftValidation.message}</AlertDescription>
            </Alert>
          )}

          {operatingHoursInfo?.isClosed && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cannot create shifts on days when the location is closed
              </AlertDescription>
            </Alert>
          )}

          {/* Apply to Multiple Days */}
          {!shift && (
            <div className="space-y-2">
              <Label>Apply to</Label>
              <div className="flex gap-2">
                {WEEKDAYS.map((day, index) => (
                  <Button
                    key={day}
                    type="button"
                    variant={applyToDays.includes(index) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleApplyDay(index)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Assign Employees */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Assign Specific Employees (Optional)</Label>
              <div className="flex items-center gap-2">
                {batchMode && (
                  <Badge variant="secondary">
                    Batch Mode: {selectedEmployees.length} individual shifts
                  </Badge>
                )}
                {!batchMode && (
                  <Badge 
                    variant={
                      selectedEmployees.length >= parseInt(formData.required_count) 
                        ? "default" 
                        : selectedEmployees.length > 0 
                        ? "secondary" 
                        : "outline"
                    }
                  >
                    {selectedEmployees.length} / {formData.required_count} positions filled
                  </Badge>
                )}
              </div>
            </div>
            {formData.role && !batchMode && (
              <p className="text-xs text-muted-foreground">
                Assign specific employees to fill the {formData.required_count} {formData.role} positions needed for this shift
              </p>
            )}
            {batchMode && (
              <p className="text-xs text-muted-foreground">
                Create individual shifts for each selected employee with customizable start/end times
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allow_cross_department"
                  checked={allowCrossDepartment}
                  onCheckedChange={(checked) => setAllowCrossDepartment(checked as boolean)}
                />
                <Label htmlFor="allow_cross_department" className="cursor-pointer text-xs font-normal">
                  Show all roles
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show_all_locations"
                  checked={showAllLocations}
                  onCheckedChange={(checked) => setShowAllLocations(checked as boolean)}
                />
                <Label htmlFor="show_all_locations" className="cursor-pointer text-xs font-normal">
                  Show all locations
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="batch_mode"
                  checked={batchMode}
                  onCheckedChange={(checked) => {
                    setBatchMode(checked as boolean);
                    if (checked) {
                      // Initialize times for selected employees
                      const times: Record<string, { start_time: string; end_time: string }> = {};
                      selectedEmployees.forEach(empId => {
                        times[empId] = {
                          start_time: formData.start_time,
                          end_time: formData.end_time,
                        };
                      });
                      setIndividualTimes(times);
                    }
                  }}
                />
                <Label htmlFor="batch_mode" className="cursor-pointer text-xs font-normal">
                  Batch mode
                </Label>
              </div>
            </div>
            {batchMode ? (
              <div className="space-y-3">
                {availableEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {showAllLocations ? "No available employees found" : (formData.location_id ? "No available employees at this location" : "Select a location first")}
                  </p>
                ) : (
                  availableEmployees
                    .filter(emp => allowCrossDepartment || emp.role === formData.role || !formData.role || selectedEmployees.includes(emp.id))
                    .map((employee) => {
                      const isSelected = selectedEmployees.includes(employee.id);
                      const times = individualTimes[employee.id] || {
                        start_time: formData.start_time,
                        end_time: formData.end_time,
                      };
                      
                      return (
                        <div key={employee.id} className="border rounded-lg p-3 space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`employee-batch-${employee.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEmployees([...selectedEmployees, employee.id]);
                                  setIndividualTimes({
                                    ...individualTimes,
                                    [employee.id]: {
                                      start_time: formData.start_time,
                                      end_time: formData.end_time,
                                    },
                                  });
                                } else {
                                  setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                                  const newTimes = { ...individualTimes };
                                  delete newTimes[employee.id];
                                  setIndividualTimes(newTimes);
                                }
                              }}
                            />
                            <Label 
                              htmlFor={`employee-batch-${employee.id}`} 
                              className="cursor-pointer font-medium flex-1"
                            >
                              {employee.full_name} - {employee.role}
                              {showAllLocations && employee.locations?.name && (
                                <span className="text-muted-foreground font-normal"> ({employee.locations.name})</span>
                              )}
                            </Label>
                            {employeeShiftInfo[employee.id]?.hasShift && (
                              <div className="flex items-center gap-2 ml-2">
                                <span className="text-xs text-muted-foreground">
                                  ({employeeShiftInfo[employee.id]?.shiftTimes})
                                </span>
                                <Badge 
                                  variant={employeeShiftInfo[employee.id]?.hasConflict ? "destructive" : "secondary"}
                                  className="flex items-center gap-1 text-xs"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  {employeeShiftInfo[employee.id]?.hasConflict ? "Conflict" : "Has shift"}
                                </Badge>
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="ml-6 space-y-3">
                              {/* Individual Preset Selector */}
                              <div className="space-y-1">
                                <Label className="text-xs">Quick Preset</Label>
                                <Select
                                  value={individualPresets[employee.id] || "custom"}
                                  onValueChange={(presetName) => {
                                    setIndividualPresets({
                                      ...individualPresets,
                                      [employee.id]: presetName,
                                    });
                                    
                                    if (presetName !== "custom") {
                                      const preset = shiftPresets.find(p => p.name === presetName);
                                      if (preset) {
                                        setIndividualTimes({
                                          ...individualTimes,
                                          [employee.id]: {
                                            start_time: preset.start_time,
                                            end_time: preset.end_time,
                                          },
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Choose preset" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="custom">Custom</SelectItem>
                                    {shiftPresets.map((preset) => (
                                      <SelectItem key={preset.name} value={preset.name}>
                                        {preset.name} ({preset.start_time}-{preset.end_time})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Individual Time Inputs */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Start Time</Label>
                                  <Input
                                    type="time"
                                    value={times.start_time}
                                    onChange={(e) => {
                                      setIndividualTimes({
                                        ...individualTimes,
                                        [employee.id]: {
                                          ...times,
                                          start_time: e.target.value,
                                        },
                                      });
                                      // Reset to custom when manually editing
                                      setIndividualPresets({
                                        ...individualPresets,
                                        [employee.id]: "custom",
                                      });
                                    }}
                                    className="h-8"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">End Time</Label>
                                  <Input
                                    type="time"
                                    value={times.end_time}
                                    onChange={(e) => {
                                      setIndividualTimes({
                                        ...individualTimes,
                                        [employee.id]: {
                                          ...times,
                                          end_time: e.target.value,
                                        },
                                      });
                                      // Reset to custom when manually editing
                                      setIndividualPresets({
                                        ...individualPresets,
                                        [employee.id]: "custom",
                                      });
                                    }}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {availableEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {showAllLocations ? "No available employees found" : (formData.location_id ? "No available employees at this location" : "Select a location first")}
                  </p>
                ) : (
                  availableEmployees
                    .filter(emp => allowCrossDepartment || emp.role === formData.role || !formData.role || selectedEmployees.includes(emp.id))
                    .map((employee) => {
                      const isDisabled = !selectedEmployees.includes(employee.id) && 
                                        !batchMode &&
                                        selectedEmployees.length >= parseInt(formData.required_count);
                      return (
                        <div key={employee.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`employee-${employee.id}`}
                            checked={selectedEmployees.includes(employee.id)}
                            disabled={isDisabled}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedEmployees([...selectedEmployees, employee.id]);
                              } else {
                                setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                              }
                            }}
                          />
                          <Label 
                            htmlFor={`employee-${employee.id}`} 
                            className={`cursor-pointer flex-1 ${isDisabled ? 'opacity-50' : ''}`}
                          >
                            {employee.full_name} - {employee.role}
                            {showAllLocations && employee.locations?.name && (
                              <span className="text-muted-foreground"> ({employee.locations.name})</span>
                            )}
                          </Label>
                          {employeeShiftInfo[employee.id]?.hasShift && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                ({employeeShiftInfo[employee.id]?.shiftTimes})
                              </span>
                              <Badge 
                                variant={employeeShiftInfo[employee.id]?.hasConflict ? "destructive" : "secondary"}
                                className="flex items-center gap-1 text-xs"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {employeeShiftInfo[employee.id]?.hasConflict ? "Conflict" : "Has shift"}
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            )}
            {!batchMode && selectedEmployees.length < parseInt(formData.required_count) && selectedEmployees.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                ⚠️ {parseInt(formData.required_count) - selectedEmployees.length} more {formData.role || 'staff'} position{parseInt(formData.required_count) - selectedEmployees.length > 1 ? 's' : ''} still need to be filled
              </p>
            )}
            {!batchMode && selectedEmployees.length === 0 && formData.role && (
              <p className="text-xs text-muted-foreground">
                💡 Leave unassigned to keep as an open shift that staff can claim
              </p>
            )}
          </div>

          {/* Checkboxes */}
          <TooltipProvider>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_open_shift"
                  checked={formData.is_open_shift}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_open_shift: checked as boolean })
                  }
                />
                <Label htmlFor="is_open_shift" className="cursor-pointer">Open Shift</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>Makes this shift available for employees to claim. Useful when you need coverage but haven't assigned anyone yet.</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_published: checked as boolean })
                  }
                />
                <Label htmlFor="is_published" className="cursor-pointer">Published</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>When published, the shift becomes visible to assigned employees in their schedule. Unpublished shifts are only visible to managers.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>

          {/* Shift Notes */}
          <div className="space-y-2">
            <Label>Shift Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Let the employee know any important details about this shift..."
              rows={3}
            />
          </div>

          <div className="flex justify-between gap-2">
            <div>
              {shift && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteShift.isPending}
                >
                  Delete Shift
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createShift.isPending || 
                  updateShift.isPending || 
                  operatingHoursInfo?.isClosed || 
                  (shiftValidation && !shiftValidation.isValid)
                }
              >
                {shift ? "Update" : "Create"} Shift
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};