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
import { Checkbox } from "@/components/ui/checkbox";
import { useLocationSchedules, useUpsertLocationSchedule } from "@/hooks/useLocationSchedules";

interface LocationScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
}

const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

export const LocationScheduleDialog = ({
  open,
  onOpenChange,
  locationId,
}: LocationScheduleDialogProps) => {
  const { data: schedules = [], isLoading } = useLocationSchedules(locationId);
  const upsertSchedule = useUpsertLocationSchedule();
  
  const [daySchedules, setDaySchedules] = useState<Record<number, { open_time: string; close_time: string; is_closed: boolean }>>({});

  useEffect(() => {
    if (schedules.length > 0) {
      const scheduleMap: Record<number, { open_time: string; close_time: string; is_closed: boolean }> = {};
      schedules.forEach(schedule => {
        scheduleMap[schedule.day_of_week] = {
          open_time: schedule.open_time.slice(0, 5), // HH:MM format
          close_time: schedule.close_time.slice(0, 5),
          is_closed: schedule.is_closed
        };
      });
      setDaySchedules(scheduleMap);
    } else {
      // Initialize with default 24/7 schedule
      const defaultSchedule: Record<number, { open_time: string; close_time: string; is_closed: boolean }> = {};
      DAYS.forEach(day => {
        defaultSchedule[day.value] = { open_time: "00:00", close_time: "23:59", is_closed: false };
      });
      setDaySchedules(defaultSchedule);
    }
  }, [schedules]);

  const handleSave = async () => {
    try {
      for (const day of DAYS) {
        const schedule = daySchedules[day.value];
        if (schedule) {
          await upsertSchedule.mutateAsync({
            location_id: locationId,
            day_of_week: day.value,
            open_time: schedule.open_time,
            close_time: schedule.close_time,
            is_closed: schedule.is_closed,
          });
        }
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save schedules:", error);
    }
  };

  const updateDaySchedule = (day: number, field: string, value: string | boolean) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      }
    }));
  };

  const copyToAll = (sourceDay: number) => {
    const source = daySchedules[sourceDay];
    if (!source) return;
    
    const newSchedules = { ...daySchedules };
    DAYS.forEach(day => {
      newSchedules[day.value] = { ...source };
    });
    setDaySchedules(newSchedules);
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Operating Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {DAYS.map((day) => {
            const schedule = daySchedules[day.value] || { open_time: "00:00", close_time: "23:59", is_closed: false };
            
            return (
              <div key={day.value} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`closed-${day.value}`}
                      checked={schedule.is_closed}
                      onCheckedChange={(checked) =>
                        updateDaySchedule(day.value, "is_closed", checked as boolean)
                      }
                    />
                    <Label htmlFor={`closed-${day.value}`} className="font-semibold cursor-pointer">
                      {day.label}
                    </Label>
                    {schedule.is_closed && (
                      <span className="text-sm text-muted-foreground">(Closed)</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToAll(day.value)}
                  >
                    Copy to all
                  </Button>
                </div>

                {!schedule.is_closed && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`open-${day.value}`} className="text-sm">
                        Opens
                      </Label>
                      <Input
                        id={`open-${day.value}`}
                        type="time"
                        value={schedule.open_time}
                        onChange={(e) =>
                          updateDaySchedule(day.value, "open_time", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`close-${day.value}`} className="text-sm">
                        Closes
                      </Label>
                      <Input
                        id={`close-${day.value}`}
                        type="time"
                        value={schedule.close_time}
                        onChange={(e) =>
                          updateDaySchedule(day.value, "close_time", e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={upsertSchedule.isPending}
          >
            Save Schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
