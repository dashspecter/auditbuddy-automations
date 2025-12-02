import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RecurringScheduleDialog } from '@/components/RecurringScheduleDialog';
import {
  useRecurringSchedules,
  useUpdateRecurringSchedule,
  useDeleteRecurringSchedule,
  RecurringSchedule,
} from '@/hooks/useRecurringSchedules';
import { Plus, Repeat, Edit, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RecurringAuditSchedules = () => {
  const { data: schedules, isLoading } = useRecurringSchedules();
  const updateSchedule = useUpdateRecurringSchedule();
  const deleteSchedule = useDeleteRecurringSchedule();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringSchedule | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  const handleEdit = (schedule: RecurringSchedule) => {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingSchedule(undefined);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setScheduleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (scheduleToDelete) {
      await deleteSchedule.mutateAsync(scheduleToDelete);
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };

  const handleToggleActive = async (schedule: RecurringSchedule) => {
    await updateSchedule.mutateAsync({
      id: schedule.id,
      is_active: !schedule.is_active,
    });
  };

  const getRecurrenceLabel = (schedule: RecurringSchedule) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    switch (schedule.recurrence_pattern) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return `Weekly on ${days[schedule.day_of_week || 0]}`;
      case 'monthly':
        return `Monthly on day ${schedule.day_of_month}`;
      default:
        return schedule.recurrence_pattern;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Repeat className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Recurring Audit Schedules</h1>
              <p className="text-muted-foreground">
                Automatically schedule audits on a recurring basis
              </p>
            </div>
          </div>
          
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Schedule
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            {!schedules || schedules.length === 0 ? (
              <div className="text-center py-12">
                <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No recurring schedules yet</p>
                <p className="text-muted-foreground mb-4">
                  Create your first recurring schedule to automatically generate audits
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Schedule
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Recurrence</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.name}</TableCell>
                        <TableCell>
                          {schedule.locations?.name}
                          {schedule.locations?.city && ` - ${schedule.locations.city}`}
                        </TableCell>
                        <TableCell>{schedule.audit_templates?.name}</TableCell>
                        <TableCell>
                          {schedule.profiles?.full_name || schedule.profiles?.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getRecurrenceLabel(schedule)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {schedule.start_time} ({schedule.duration_hours}h)
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={schedule.is_active}
                            onCheckedChange={() => handleToggleActive(schedule)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(schedule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      <RecurringScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={editingSchedule}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring schedule? This will not affect already scheduled audits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecurringAuditSchedules;
