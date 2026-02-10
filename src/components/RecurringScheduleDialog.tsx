import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCreateRecurringSchedule, useUpdateRecurringSchedule, RecurringSchedule } from '@/hooks/useRecurringSchedules';
import { useLocations } from '@/hooks/useLocations';
import { useTemplates } from '@/hooks/useTemplates';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Repeat } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SchedulePreviewDates } from '@/components/recurring-schedules/SchedulePreviewDates';
import { BulkLocationSelector } from '@/components/recurring-schedules/BulkLocationSelector';
import { toast } from 'sonner';

const recurringScheduleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location_id: z.string().optional(), // Now optional when bulk mode is enabled
  template_id: z.string().min(1, 'Template is required'),
  assigned_user_id: z.string().min(1, 'Assigned user is required'),
  recurrence_pattern: z.enum(['daily', 'weekly', 'monthly', 'every_4_weeks']),
  day_of_week: z.string().optional(),
  day_of_month: z.string().optional(),
  start_time: z.string().min(1, 'Start time is required'),
  duration_hours: z.string().min(1, 'Duration is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof recurringScheduleSchema>;

interface RecurringScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: RecurringSchedule;
}

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export const RecurringScheduleDialog = ({ open, onOpenChange, schedule }: RecurringScheduleDialogProps) => {
  const { data: locations } = useLocations();
  const { data: templates } = useTemplates();
  const createSchedule = useCreateRecurringSchedule();
  const updateSchedule = useUpdateRecurringSchedule();
  
  // Bulk location mode state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isCreatingBulk, setIsCreatingBulk] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['users_for_scheduling'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(recurringScheduleSchema),
    defaultValues: {
      name: '',
      location_id: '',
      template_id: '',
      assigned_user_id: '',
      recurrence_pattern: 'weekly',
      day_of_week: '1',
      day_of_month: '1',
      start_time: '09:00',
      duration_hours: '2',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      notes: '',
    },
  });
  
  // Reset bulk mode when dialog closes or when editing
  useEffect(() => {
    if (!open) {
      setBulkMode(false);
      setSelectedLocationIds([]);
    }
    if (schedule) {
      setBulkMode(false);
    }
  }, [open, schedule]);

  useEffect(() => {
    if (schedule) {
      form.reset({
        name: schedule.name,
        location_id: schedule.location_id,
        template_id: schedule.template_id,
        assigned_user_id: schedule.assigned_user_id,
        recurrence_pattern: schedule.recurrence_pattern,
        day_of_week: schedule.day_of_week?.toString() || '1',
        day_of_month: schedule.day_of_month?.toString() || '1',
        start_time: schedule.start_time,
        duration_hours: schedule.duration_hours.toString(),
        start_date: schedule.start_date,
        end_date: schedule.end_date || '',
        notes: schedule.notes || '',
      });
    }
  }, [schedule, form]);

  const recurrencePattern = form.watch('recurrence_pattern');
  const startDate = form.watch('start_date');
  const dayOfWeek = form.watch('day_of_week');
  const dayOfMonth = form.watch('day_of_month');

  const onSubmit = async (values: FormValues) => {
    // Bulk mode: create one schedule per selected location
    if (bulkMode && selectedLocationIds.length > 0 && !schedule) {
      setIsCreatingBulk(true);
      try {
        let successCount = 0;
        for (const locationId of selectedLocationIds) {
          const location = locations?.find((l) => l.id === locationId);
          const scheduleData = {
            name: `${values.name}${selectedLocationIds.length > 1 ? ` - ${location?.name || ''}` : ''}`,
            location_id: locationId,
            template_id: values.template_id,
            assigned_user_id: values.assigned_user_id,
            recurrence_pattern: values.recurrence_pattern,
      day_of_week: (recurrencePattern === 'weekly' || recurrencePattern === 'every_4_weeks') ? parseInt(values.day_of_week || '1') : undefined,
      day_of_month: recurrencePattern === 'monthly' ? parseInt(values.day_of_month || '1') : undefined,
            start_time: values.start_time,
            duration_hours: parseInt(values.duration_hours),
            start_date: values.start_date,
            end_date: values.end_date || undefined,
            notes: values.notes,
          };
          try {
            await createSchedule.mutateAsync(scheduleData);
            successCount++;
          } catch (err) {
            console.error(`Failed to create schedule for ${location?.name}:`, err);
          }
        }
        toast.success(`Created ${successCount} recurring schedule${successCount > 1 ? 's' : ''}`);
        form.reset();
        onOpenChange(false);
      } finally {
        setIsCreatingBulk(false);
      }
      return;
    }

    // Single location mode (edit or create)
    if (!bulkMode && !values.location_id) {
      toast.error('Please select a location');
      return;
    }

    const scheduleData = {
      name: values.name,
      location_id: values.location_id!,
      template_id: values.template_id,
      assigned_user_id: values.assigned_user_id,
      recurrence_pattern: values.recurrence_pattern,
      day_of_week: (recurrencePattern === 'weekly' || recurrencePattern === 'every_4_weeks') ? parseInt(values.day_of_week || '1') : undefined,
      day_of_month: recurrencePattern === 'monthly' ? parseInt(values.day_of_month || '1') : undefined,
      start_time: values.start_time,
      duration_hours: parseInt(values.duration_hours),
      start_date: values.start_date,
      end_date: values.end_date || undefined,
      notes: values.notes,
    };

    if (schedule?.id) {
      await updateSchedule.mutateAsync({ id: schedule.id, ...scheduleData });
    } else {
      await createSchedule.mutateAsync(scheduleData);
    }
    
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            {schedule?.id ? 'Edit' : 'Create'} Recurring Schedule
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Weekly Health Inspection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location selection - single or bulk mode */}
            {!schedule && (
              <div className="flex items-center space-x-2 pb-2">
                <Switch
                  id="bulk-mode"
                  checked={bulkMode}
                  onCheckedChange={(checked) => {
                    setBulkMode(checked);
                    if (checked) {
                      form.setValue('location_id', '');
                    } else {
                      setSelectedLocationIds([]);
                    }
                  }}
                />
                <Label htmlFor="bulk-mode" className="text-sm">
                  Schedule for multiple locations
                </Label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {bulkMode && !schedule ? (
                <FormItem>
                  <FormLabel>Locations</FormLabel>
                  <BulkLocationSelector
                    locations={locations || []}
                    selectedLocationIds={selectedLocationIds}
                    onSelectionChange={setSelectedLocationIds}
                  />
                  {selectedLocationIds.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Select at least one location
                    </p>
                  )}
                </FormItem>
              ) : (
                <FormField
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations?.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name} {location.city && `- ${location.city}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audit Template</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigned_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recurrence_pattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recurrence Pattern</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="every_4_weeks">Every 4 Weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(recurrencePattern === 'weekly' || recurrencePattern === 'every_4_weeks') && (
              <FormField
                control={form.control}
                name="day_of_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {recurrencePattern === 'monthly' && (
              <FormField
                control={form.control}
                name="day_of_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Month</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      If the day doesn't exist in a month, the last day will be used
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Preview upcoming dates */}
            {startDate && (
              <SchedulePreviewDates
                pattern={recurrencePattern}
                startDate={startDate}
                dayOfWeek={(recurrencePattern === 'weekly' || recurrencePattern === 'every_4_weeks') ? parseInt(dayOfWeek || '1') : undefined}
                dayOfMonth={recurrencePattern === 'monthly' ? parseInt(dayOfMonth || '1') : undefined}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (hours)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave empty for indefinite recurrence
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any special instructions..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
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
                  createSchedule.isPending || 
                  updateSchedule.isPending || 
                  isCreatingBulk ||
                  (bulkMode && selectedLocationIds.length === 0)
                }
              >
                {isCreatingBulk 
                  ? `Creating ${selectedLocationIds.length} schedules...`
                  : createSchedule.isPending || updateSchedule.isPending 
                    ? (schedule?.id ? 'Updating...' : 'Creating...') 
                    : bulkMode && selectedLocationIds.length > 1
                      ? `Create ${selectedLocationIds.length} Schedules`
                      : (schedule?.id ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
