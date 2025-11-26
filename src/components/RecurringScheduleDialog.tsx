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
import { useCreateRecurringSchedule, useUpdateRecurringSchedule, RecurringSchedule } from '@/hooks/useRecurringSchedules';
import { useLocations } from '@/hooks/useLocations';
import { useTemplates } from '@/hooks/useTemplates';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Repeat } from 'lucide-react';
import { useEffect } from 'react';

const recurringScheduleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location_id: z.string().min(1, 'Location is required'),
  template_id: z.string().min(1, 'Template is required'),
  assigned_user_id: z.string().min(1, 'Assigned user is required'),
  recurrence_pattern: z.enum(['daily', 'weekly', 'monthly']),
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

  const onSubmit = async (values: FormValues) => {
    const scheduleData = {
      name: values.name,
      location_id: values.location_id,
      template_id: values.template_id,
      assigned_user_id: values.assigned_user_id,
      recurrence_pattern: values.recurrence_pattern,
      day_of_week: recurrencePattern === 'weekly' ? parseInt(values.day_of_week || '1') : undefined,
      day_of_month: recurrencePattern === 'monthly' ? parseInt(values.day_of_month || '1') : undefined,
      start_time: values.start_time,
      duration_hours: parseInt(values.duration_hours),
      start_date: values.start_date,
      end_date: values.end_date || undefined,
      notes: values.notes,
    };

    if (schedule) {
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
            {schedule ? 'Edit' : 'Create'} Recurring Schedule
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

            <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {recurrencePattern === 'weekly' && (
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
                disabled={createSchedule.isPending || updateSchedule.isPending}
              >
                {createSchedule.isPending || updateSchedule.isPending 
                  ? (schedule ? 'Updating...' : 'Creating...') 
                  : (schedule ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
