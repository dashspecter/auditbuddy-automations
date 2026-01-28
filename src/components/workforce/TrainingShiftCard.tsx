import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GraduationCap, User, Users, Clock, MapPin, ClipboardList, CheckCircle2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Shift } from "@/hooks/useShifts";

interface TrainingShiftCardProps {
  shift: Shift;
  compact?: boolean;
}

export const TrainingShiftCard = ({ shift, compact = false }: TrainingShiftCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const session = shift.training_session;
  const module = shift.training_module;
  
  const trainers = session?.attendees?.filter(a => a.attendee_role === 'trainer') || [];
  const trainees = session?.attendees?.filter(a => a.attendee_role === 'trainee') || [];
  
  const trainerName = session?.trainer?.full_name || trainers[0]?.employee?.full_name || t('training.noTrainer', 'No trainer');
  const traineeCount = trainees.length;

  if (compact) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <div 
            className="p-2 rounded-lg border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/30 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center gap-1 mb-1">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-[10px] px-1 py-0">
                <GraduationCap className="h-2.5 w-2.5 mr-0.5" />
                Training
              </Badge>
            </div>
            <div className="text-xs font-medium truncate">
              {shift.cohort_label || module?.name || t('training.session', 'Training Session')}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Users className="h-2.5 w-2.5" />
              {traineeCount} trainee{traineeCount !== 1 ? 's' : ''}
            </div>
          </div>
        </SheetTrigger>
        <TrainingShiftPanel shift={shift} />
      </Sheet>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Card className="p-3 border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/30 hover:shadow-md transition-shadow cursor-pointer">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                <GraduationCap className="h-3 w-3 mr-1" />
                Training
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Users className="h-2.5 w-2.5 mr-1" />
                {traineeCount}
              </Badge>
            </div>
            
            <div className="font-medium text-sm">
              {shift.cohort_label || module?.name || t('training.session', 'Training Session')}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {trainerName}
            </div>
          </div>
        </Card>
      </SheetTrigger>
      <TrainingShiftPanel shift={shift} />
    </Sheet>
  );
};

const TrainingShiftPanel = ({ shift }: { shift: Shift }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const session = shift.training_session;
  const module = shift.training_module;
  
  const trainers = session?.attendees?.filter(a => a.attendee_role === 'trainer') || [];
  const trainees = session?.attendees?.filter(a => a.attendee_role === 'trainee') || [];

  return (
    <SheetContent className="w-[400px] sm:w-[540px]">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          {shift.cohort_label || t('training.session', 'Training Session')}
        </SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        {/* Module info */}
        {module && (
          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
            <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {t('training.module', 'Module')}
            </div>
            <div className="text-lg font-semibold">{module.name}</div>
          </div>
        )}

        {/* Time & Location */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</span>
          </div>
          {shift.locations?.name && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{shift.locations.name}</span>
            </div>
          )}
        </div>

        {/* Trainer */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">
            {t('training.trainer', 'Trainer')}
          </div>
          <div className="flex flex-wrap gap-2">
            {trainers.map(t => (
              <Badge key={t.id} variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                <User className="h-3 w-3 mr-1" />
                {t.employee?.full_name || 'Unknown'}
              </Badge>
            ))}
            {trainers.length === 0 && session?.trainer && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                <User className="h-3 w-3 mr-1" />
                {session.trainer.full_name}
              </Badge>
            )}
          </div>
        </div>

        {/* Trainees */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">
            {t('training.trainees', 'Trainees')} ({trainees.length})
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {trainees.map(trainee => (
              <Badge key={trainee.id} variant="outline">
                {trainee.employee?.full_name || 'Unknown'}
              </Badge>
            ))}
            {trainees.length === 0 && (
              <span className="text-sm text-muted-foreground">
                {t('training.noTrainees', 'No trainees assigned')}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/workforce/training')}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            {t('training.viewAssignments', 'View Training Assignments')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate(`/tasks?date=${shift.shift_date}`)}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {t('training.viewTodayTasks', "View Today's Tasks")}
          </Button>
        </div>
      </div>
    </SheetContent>
  );
};

export default TrainingShiftCard;
