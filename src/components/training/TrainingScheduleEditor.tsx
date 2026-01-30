import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Clock, Edit2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTrainingSchedule, useUpdateTrainingShiftTime, TrainingDaySchedule } from "@/hooks/useTrainingSchedule";

interface TrainingScheduleEditorProps {
  assignmentId: string;
}

const formatTime = (time: string) => {
  // Convert "HH:mm:ss" or "HH:mm" to "HH:mm" for display
  return time.slice(0, 5);
};

const TrainingScheduleEditor = ({ assignmentId }: TrainingScheduleEditorProps) => {
  const { t } = useTranslation();
  const { data: schedule = [], isLoading } = useTrainingSchedule(assignmentId);
  const updateTime = useUpdateTrainingShiftTime();

  const [editingDay, setEditingDay] = useState<TrainingDaySchedule | null>(null);
  const [editForm, setEditForm] = useState({ startTime: "", endTime: "" });

  const handleOpenEdit = (day: TrainingDaySchedule) => {
    setEditingDay(day);
    setEditForm({
      startTime: formatTime(day.startTime),
      endTime: formatTime(day.endTime),
    });
  };

  const handleSave = async () => {
    if (!editingDay) return;

    // Append seconds if needed
    const startTime = editForm.startTime.length === 5 ? `${editForm.startTime}:00` : editForm.startTime;
    const endTime = editForm.endTime.length === 5 ? `${editForm.endTime}:00` : editForm.endTime;

    try {
      await updateTime.mutateAsync({
        sessionId: editingDay.sessionId,
        shiftId: editingDay.shiftId,
        startTime,
        endTime,
      });
      setEditingDay(null);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("training.schedule", "Training Schedule")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (schedule.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("training.schedule", "Training Schedule")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{t("training.noSchedule", "No schedule generated yet")}</p>
            <p className="text-sm mt-1">
              {t("training.generateScheduleHint", "Use 'Generate Schedule' to create training days")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("training.schedule", "Training Schedule")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {schedule.map((day) => (
              <div
                key={day.sessionId}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="min-w-[60px] justify-center">
                    {t("training.day", "Day")} {day.dayNumber}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">
                      {format(parseISO(day.sessionDate), "EEE, MMM d, yyyy")}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatTime(day.startTime)} - {formatTime(day.endTime)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(day)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                  <span className="sr-only">{t("common.edit", "Edit")}</span>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingDay} onOpenChange={(open) => !open && setEditingDay(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("training.editTime", "Edit Training Time")}
            </DialogTitle>
          </DialogHeader>
          {editingDay && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">
                  {t("training.date", "Date")}
                </Label>
                <p className="font-medium">
                  {format(parseISO(editingDay.sessionDate), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">
                    {t("training.startTime", "Start Time")}
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) =>
                      setEditForm({ ...editForm, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">
                    {t("training.endTime", "End Time")}
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) =>
                      setEditForm({ ...editForm, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
              {editForm.startTime >= editForm.endTime && editForm.endTime && (
                <p className="text-sm text-destructive">
                  {t("training.endAfterStart", "End time must be after start time")}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDay(null)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                updateTime.isPending ||
                !editForm.startTime ||
                !editForm.endTime ||
                editForm.startTime >= editForm.endTime
              }
            >
              {updateTime.isPending
                ? t("common.saving", "Saving...")
                : t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrainingScheduleEditor;
