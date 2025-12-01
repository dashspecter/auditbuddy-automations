import { useState, useEffect } from "react";
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
import { Plus, X } from "lucide-react";
import { useCreateShift, useUpdateShift, useDeleteShift } from "@/hooks/useShifts";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { useLocations } from "@/hooks/useLocations";
import { useEmployees } from "@/hooks/useEmployees";
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

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const { data: roles = [] } = useEmployeeRoles();
  const { data: locations = [] } = useLocations();

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
    }
  }, [shift, defaultDate, open]);

  const handleAddBreak = () => {
    setBreaks([...breaks, { start: "12:00", end: "12:30" }]);
  };

  const handleRemoveBreak = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
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
    
    const submitData = {
      ...formData,
      required_count: parseInt(formData.required_count),
      break_duration_minutes: parseInt(formData.break_duration_minutes),
      notes: formData.notes || null,
      breaks: breaks,
    };

    if (shift) {
      await updateShift.mutateAsync({ id: shift.id, ...submitData });
      onOpenChange(false);
    } else {
      // Create shift for selected date
      await createShift.mutateAsync(submitData);
      
      // If apply to multiple days is selected, create shifts for those days too
      if (applyToDays.length > 0) {
        const currentDate = new Date(formData.shift_date);
        const currentDayOfWeek = (currentDate.getDay() + 6) % 7; // Convert to 0=Monday
        
        for (const dayIndex of applyToDays) {
          if (dayIndex !== currentDayOfWeek) {
            const daysToAdd = dayIndex - currentDayOfWeek;
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + daysToAdd);
            
            await createShift.mutateAsync({
              ...submitData,
              shift_date: format(newDate, 'yyyy-MM-dd'),
            });
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
              <Label>Staff Needed *</Label>
              <Input
                type="number"
                min="1"
                value={formData.required_count}
                onChange={(e) =>
                  setFormData({ ...formData, required_count: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
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

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="close_duty"
                checked={formData.close_duty}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, close_duty: checked as boolean })
                }
              />
              <Label htmlFor="close_duty" className="cursor-pointer">Close Duty</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_open_shift"
                checked={formData.is_open_shift}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_open_shift: checked as boolean })
                }
              />
              <Label htmlFor="is_open_shift" className="cursor-pointer">Open Shift</Label>
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
            </div>
          </div>

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
                disabled={createShift.isPending || updateShift.isPending}
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