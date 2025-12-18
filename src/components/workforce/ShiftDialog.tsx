import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle } from "lucide-react";
import { useCreateShift, useUpdateShift } from "@/hooks/useShifts";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { useLocations } from "@/hooks/useLocations";
import { useLocationOperatingSchedules } from "@/hooks/useLocationOperatingSchedules";

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: any;
  defaultDate?: Date;
}

export const ShiftDialog = ({
  open,
  onOpenChange,
  shift,
  defaultDate,
}: ShiftDialogProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    location_id: "",
    shift_date: "",
    start_time: "",
    end_time: "",
    role: "",
    required_count: "1",
    notes: "",
  });

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const { data: roles = [] } = useEmployeeRoles();
  const { data: locations = [] } = useLocations();
  const { data: operatingSchedules = [] } = useLocationOperatingSchedules(formData.location_id);

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
    // For overnight detection: only consider it overnight if close < open AND close is NOT midnight
    const isMidnightClose = closeTimeNormalized === "00:00:00";
    const isOvernightOperation = !isMidnightClose && closeTimeNormalized < openTimeNormalized;
    
    let isOutsideHours = false;
    
    if (isOvernightOperation) {
      // For overnight operations (e.g., 18:00 - 02:00):
      // Shift is valid if it starts on or after opening time (daytime portion)
      // or ends before or at closing time (early morning portion)
      if (shiftStart >= openTimeNormalized) {
        isOutsideHours = false;
      } else if (shiftEnd <= closeTimeNormalized) {
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
      });
    } else {
      const dateStr = defaultDate ? defaultDate.toISOString().split('T')[0] : "";
      setFormData({
        location_id: "",
        shift_date: dateStr,
        start_time: "09:00",
        end_time: "17:00",
        role: "",
        required_count: "1",
        notes: "",
      });
    }
  }, [shift, defaultDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      required_count: parseInt(formData.required_count),
      notes: formData.notes || null,
    };

    if (shift) {
      await updateShift.mutateAsync({ id: shift.id, ...submitData });
    } else {
      await createShift.mutateAsync(submitData);
    }
    
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>
              {shift ? t('workforce.components.shiftDialog.editShift') : t('workforce.components.shiftDialog.createShift')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_id">{t('workforce.components.shiftDialog.location')} *</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, location_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('workforce.components.shiftDialog.selectLocation')} />
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
                <Label htmlFor="shift_date">{t('workforce.components.shiftDialog.date')} *</Label>
                <Input
                  id="shift_date"
                  type="date"
                  value={formData.shift_date}
                  onChange={(e) =>
                    setFormData({ ...formData, shift_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">{t('workforce.components.shiftDialog.startTime')} *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">{t('workforce.components.shiftDialog.endTime')} *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">{t('workforce.components.shiftDialog.roleRequired')} *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('workforce.components.shiftDialog.selectRole')} />
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
                <Label htmlFor="required_count">{t('workforce.components.shiftDialog.staffNeeded')} *</Label>
                <Input
                  id="required_count"
                  type="number"
                  min="1"
                  value={formData.required_count}
                  onChange={(e) =>
                    setFormData({ ...formData, required_count: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Operating Hours Info */}
            {operatingHoursInfo && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  {operatingHoursInfo.isClosed ? (
                    <span className="text-destructive font-medium">
                      {t('workforce.components.shiftDialog.locationClosed')}
                    </span>
                  ) : (
                    <span>
                      {t('workforce.components.shiftDialog.operatingHours')}: {operatingHoursInfo.openTime} - {operatingHoursInfo.closeTime}
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
                  {t('workforce.components.shiftDialog.cannotCreateClosed')}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">{t('workforce.components.shiftDialog.notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder={t('workforce.components.shiftDialog.notesPlaceholder')}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('workforce.components.shiftDialog.cancel')}
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
                {shift ? t('workforce.components.shiftDialog.update') : t('workforce.components.shiftDialog.create')} {t('workforce.shifts.title').split(' ')[0]}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
