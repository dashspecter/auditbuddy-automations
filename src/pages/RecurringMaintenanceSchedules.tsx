import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, MapPin, User, Trash2, ChevronDown } from "lucide-react";
import { useRecurringMaintenanceSchedules, useDeleteRecurringMaintenanceSchedule } from "@/hooks/useRecurringMaintenanceSchedules";
import { RecurringMaintenanceDialog } from "@/components/RecurringMaintenanceDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { calculateNextDates, formatSchedulePreview } from "@/lib/recurringScheduleUtils";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export default function RecurringMaintenanceSchedules() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());

  const { data: schedules, isLoading } = useRecurringMaintenanceSchedules();
  const deleteMutation = useDeleteRecurringMaintenanceSchedule();

  const handleEdit = (schedule: any) => {
    setSelectedSchedule(schedule);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setScheduleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scheduleToDelete) {
      deleteMutation.mutate(scheduleToDelete);
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };

  const getRecurrenceLabel = (pattern: string) => {
    const patternKey = `equipment.recurringMaintenance.patterns.${pattern}`;
    const translated = t(patternKey);
    // If no translation found, fallback to capitalized pattern
    return translated === patternKey ? pattern.charAt(0).toUpperCase() + pattern.slice(1) : translated;
  };

  const toggleSchedule = (id: string) => {
    const newExpanded = new Set(expandedSchedules);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSchedules(newExpanded);
  };

  const getPreviewDates = (schedule: any) => {
    const dates = calculateNextDates({
      pattern: schedule.recurrence_pattern,
      startDate: schedule.start_date,
      dayOfWeek: schedule.day_of_week,
      dayOfMonth: schedule.day_of_month,
    }, 5);
    return formatSchedulePreview(dates);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('equipment.recurringMaintenance.title')}</h1>
          <p className="text-muted-foreground">{t('equipment.recurringMaintenance.subtitle')}</p>
        </div>
        <Button onClick={() => { setSelectedSchedule(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {t('equipment.recurringMaintenance.newSchedule')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : schedules && schedules.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{schedule.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {schedule.equipment?.name}
                    </CardDescription>
                  </div>
                  <Badge variant={schedule.is_active ? "default" : "secondary"}>
                    {schedule.is_active ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{schedule.locations?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{getRecurrenceLabel(schedule.recurrence_pattern)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{schedule.start_time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{schedule.assigned_user?.full_name || schedule.assigned_user?.email}</span>
                </div>
                {schedule.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{schedule.description}</p>
                )}
                
                <Collapsible open={expandedSchedules.has(schedule.id)} onOpenChange={() => toggleSchedule(schedule.id)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between mt-2">
                      <span className="text-xs">{t('equipment.recurringMaintenance.next5Dates')}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedSchedules.has(schedule.id) ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-1">
                      {getPreviewDates(schedule).map((date, index) => (
                        <div key={index} className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">
                          {index + 1}. {date}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(schedule)} className="flex-1">
                    {t('common.edit')}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(schedule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('equipment.recurringMaintenance.empty.title')}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('equipment.recurringMaintenance.empty.description')}
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('equipment.recurringMaintenance.createFirst')}
            </Button>
          </CardContent>
        </Card>
      )}

      <RecurringMaintenanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={selectedSchedule}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('equipment.recurringMaintenance.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('equipment.recurringMaintenance.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
