import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
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
import { Badge } from '@/components/ui/badge';
import { useScheduleAudit } from '@/hooks/useScheduledAudits';
import { useCreateScheduledAudit } from '@/hooks/useScheduledAuditsNew';
import { useLocations } from '@/hooks/useLocations';
import { useTemplates } from '@/hooks/useTemplates';
import { useEmployees } from '@/hooks/useEmployees';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTerminology } from '@/hooks/useTerminology';

const DRAFT_KEY = 'schedule-audit-dialog-draft';

const auditEntrySchema = z.object({
  template_id: z.string().min(1, 'Template is required'),
  assigned_user_id: z.string().min(1, 'Assigned user is required'),
  scheduled_start: z.string().min(1, 'Start date and time is required'),
  scheduled_end: z.string().min(1, 'End date and time is required'),
  notes: z.string().optional(),
  employee_id: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.scheduled_start);
  const end = new Date(data.scheduled_end);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['scheduled_end'],
});

const scheduleAuditSchema = z.object({
  location_id: z.string().min(1, 'Location is required'),
  audits: z.array(auditEntrySchema).min(1, 'At least one audit is required'),
});

type ScheduleAuditFormValues = z.infer<typeof scheduleAuditSchema>;

interface ScheduleAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Draft persistence hook for ScheduleAuditDialog
const useScheduleAuditDraft = (open: boolean, form: ReturnType<typeof useForm<ScheduleAuditFormValues>>) => {
  const isHydrating = useRef(true);
  const lastSavedData = useRef<string>('');

  const saveDraft = useCallback(() => {
    if (isHydrating.current || !open) return;
    const values = form.getValues();
    const dataStr = JSON.stringify(values);
    if (dataStr !== lastSavedData.current) {
      localStorage.setItem(DRAFT_KEY, dataStr);
      lastSavedData.current = dataStr;
    }
  }, [form, open]);

  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ScheduleAuditFormValues;
        if (parsed.location_id || parsed.audits?.some(a => a.template_id || a.assigned_user_id || a.scheduled_start)) {
          form.reset(parsed);
          lastSavedData.current = saved;
        }
      }
    } catch (e) {
      console.error('Failed to restore schedule audit draft:', e);
    }
    isHydrating.current = false;
  }, [form]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    lastSavedData.current = '';
  }, []);

  useEffect(() => {
    if (open) {
      isHydrating.current = true;
      restoreDraft();
    }
  }, [open, restoreDraft]);

  useEffect(() => {
    if (!open) return;
    const subscription = form.watch(() => {
      const timeoutId = setTimeout(saveDraft, 300);
      return () => clearTimeout(timeoutId);
    });
    return () => subscription.unsubscribe();
  }, [form, open, saveDraft]);

  useEffect(() => {
    if (!open) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveDraft();
    };
    const handlePageHide = () => saveDraft();
    const handleBeforeUnload = () => saveDraft();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [open, saveDraft]);

  return { clearDraft };
};

export const ScheduleAuditDialog = ({ open, onOpenChange }: ScheduleAuditDialogProps) => {
  const { data: locations } = useLocations();
  const { data: templates } = useTemplates(); // All templates (location + staff)
  const scheduleAudit = useScheduleAudit();
  const createScheduledAudit = useCreateScheduledAudit();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { employee, employees, location, audit, audits } = useTerminology();
  const employeeLabel = employee();
  const employeesLabel = employees();
  const locationLabel = location();
  const auditLabel = audit();
  const auditsLabel = audits();
  const employeeLabelLower = employeeLabel.toLowerCase();
  const employeesLabelLower = employeesLabel.toLowerCase();
  const locationLabelLower = locationLabel.toLowerCase();
  const auditLabelLower = auditLabel.toLowerCase();

  const { data: users } = useQuery({
    queryKey: ['users_for_scheduling_company'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!companyUser) return [];
      const { data: companyUsers } = await supabase
        .from('company_users')
        .select('user_id')
        .eq('company_id', companyUser.company_id);
      if (!companyUsers?.length) return [];
      const userIds = companyUsers.map(cu => cu.user_id);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ScheduleAuditFormValues>({
    resolver: zodResolver(scheduleAuditSchema),
    defaultValues: {
      location_id: '',
      audits: [
        {
          template_id: '',
          assigned_user_id: '',
          scheduled_start: '',
          scheduled_end: '',
          notes: '',
          employee_id: '',
        },
      ],
    },
  });

  const { clearDraft } = useScheduleAuditDraft(open, form);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'audits',
  });

  // Watch location_id for employee filtering
  const locationId = useWatch({ control: form.control, name: 'location_id' });

  // Fetch employees for the selected location (used for staff audits)
  const { data: employees } = useEmployees(
    locationId && locationId !== '__all__' ? locationId : undefined
  );
  const activeEmployees = useMemo(
    () => employees?.filter(e => e.status === 'active') || [],
    [employees]
  );

  // Build a template lookup map for quick access to template_type
  const templateMap = useMemo(() => {
    const map: Record<string, { template_type: string; name: string }> = {};
    templates?.forEach(t => {
      map[t.id] = { template_type: t.template_type, name: t.name };
    });
    return map;
  }, [templates]);

  const addAudit = () => {
    const lastAudit = form.getValues(`audits.${fields.length - 1}`);
    append({
      template_id: '',
      assigned_user_id: lastAudit?.assigned_user_id || '',
      scheduled_start: lastAudit?.scheduled_end || '',
      scheduled_end: '',
      notes: '',
      employee_id: '',
    });
  };

  const onSubmit = async (values: ScheduleAuditFormValues) => {
    // Validate: staff templates require employee_id
    for (let i = 0; i < values.audits.length; i++) {
      const audit = values.audits[i];
      const tpl = templateMap[audit.template_id];
      if (tpl?.template_type === 'staff' && !audit.employee_id) {
        form.setError(`audits.${i}.employee_id`, {
          type: 'manual',
          message: `${employeeLabel} is required for ${employeeLabelLower} ${auditsLabel.toLowerCase()}`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      for (let i = 0; i < values.audits.length; i++) {
        const audit = values.audits[i];
        const tpl = templateMap[audit.template_id];
        const isStaff = tpl?.template_type === 'staff';

        if (isStaff) {
          // Staff audits go to scheduled_audits table with employee_id
          await createScheduledAudit.mutateAsync({
            location_id: values.location_id,
            template_id: audit.template_id,
            assigned_to: audit.assigned_user_id,
            scheduled_for: new Date(audit.scheduled_start).toISOString(),
            frequency: null,
            status: 'scheduled',
            employee_id: audit.employee_id || null,
          });
        } else {
          // Location audits go to location_audits table (existing flow)
          await scheduleAudit.mutateAsync({
            location_id: values.location_id,
            template_id: audit.template_id,
            assigned_user_id: audit.assigned_user_id,
            scheduled_start: audit.scheduled_start,
            scheduled_end: audit.scheduled_end,
            notes: audit.notes,
          });
        }
      }
      
      toast.success(`${values.audits.length} ${auditLabelLower}${values.audits.length !== 1 ? 's' : ''} scheduled successfully`);
      clearDraft();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error scheduling audits:', error);
      toast.error('Failed to schedule some audits');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {`Schedule New ${auditsLabel}`}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            {/* Location selector - fixed at top */}
            <div className="pb-4">
              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locationLabel}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${locationLabelLower}`} />
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
            </div>

            <Separator className="mb-4" />

            {/* Scrollable audit entries */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <AuditEntryCard
                    key={field.id}
                    index={index}
                    form={form}
                    templates={templates}
                    templateMap={templateMap}
                    users={users}
                    activeEmployees={activeEmployees}
                    locationId={locationId}
                    canRemove={fields.length > 1}
                    onRemove={() => remove(index)}
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addAudit}
                className="w-full mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Audit
              </Button>
            </ScrollArea>

            {/* Footer buttons */}
            <div className="flex justify-between items-center pt-4 mt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {fields.length} audit{fields.length !== 1 ? 's' : ''} to schedule
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Scheduling...' : `Schedule ${fields.length} Audit${fields.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Extracted audit entry card component
interface AuditEntryCardProps {
  index: number;
  form: ReturnType<typeof useForm<ScheduleAuditFormValues>>;
  templates: any[] | undefined;
  templateMap: Record<string, { template_type: string; name: string }>;
  users: any[] | undefined;
  activeEmployees: any[];
  locationId: string;
  canRemove: boolean;
  onRemove: () => void;
}

const AuditEntryCard = ({
  index,
  form,
  templates,
  templateMap,
  users,
  activeEmployees,
  locationId,
  canRemove,
  onRemove,
}: AuditEntryCardProps) => {
  const templateId = useWatch({ control: form.control, name: `audits.${index}.template_id` });
  const selectedTemplateType = templateId ? templateMap[templateId]?.template_type : null;
  const isStaffTemplate = selectedTemplateType === 'staff';

  // Clear employee_id when switching to a location template
  useEffect(() => {
    if (!isStaffTemplate) {
      const currentEmployeeId = form.getValues(`audits.${index}.employee_id`);
      if (currentEmployeeId) {
        form.setValue(`audits.${index}.employee_id`, '');
      }
    }
  }, [isStaffTemplate, form, index]);

  return (
    <Card className="p-4 relative">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          Audit #{index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Template selector with type badges */}
        <FormField
          control={form.control}
          name={`audits.${index}.template_id`}
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
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <Badge
                          variant={template.template_type === 'staff' ? 'staff' : 'location'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {template.template_type === 'staff' ? 'Staff' : 'Location'}
                        </Badge>
                      </div>
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
          name={`audits.${index}.assigned_user_id`}
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

        {/* Conditional Employee Picker for staff audits */}
        {isStaffTemplate && (
          <FormField
            control={form.control}
            name={`audits.${index}.employee_id`}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>
                  Employee to Audit <span className="text-destructive">*</span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ''}
                  disabled={!locationId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={locationId ? "Select employee" : "Select a location first"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeEmployees.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No active employees at this location
                      </div>
                    ) : (
                      activeEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} {emp.role ? `- ${emp.role}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name={`audits.${index}.scheduled_start`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date & Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`audits.${index}.scheduled_end`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date & Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mt-4">
        <FormField
          control={form.control}
          name={`audits.${index}.notes`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any special instructions or notes..."
                  className="min-h-[60px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Card>
  );
};
