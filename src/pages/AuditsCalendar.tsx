import { useState, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/components/ui/calendar.css';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScheduleAuditDialog } from '@/components/ScheduleAuditDialog';
import { useScheduledAudits, useUpdateAuditStatus } from '@/hooks/useScheduledAudits';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    status: string;
    location: string;
    template: string;
    assignedTo: string;
    assignedUserId: string;
    isOwnAudit: boolean;
  };
}

const AuditsCalendar = () => {
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const { data: audits, isLoading } = useScheduledAudits();
  const updateStatus = useUpdateAuditStatus();
  const navigate = useNavigate();
  
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const isAdminOrManager = roleData?.isAdmin || roleData?.isManager;

  const events: CalendarEvent[] = useMemo(() => {
    if (!audits) return [];

    return audits.map((audit) => ({
      id: audit.id,
      title: `${audit.locations?.name || audit.location} - ${audit.profiles?.full_name || 'Unassigned'}`,
      start: new Date(audit.scheduled_start),
      end: new Date(audit.scheduled_end),
      resource: {
        status: audit.status,
        location: audit.locations?.name || audit.location,
        template: audit.audit_templates?.name || 'Unknown Template',
        assignedTo: audit.profiles?.full_name || audit.profiles?.email || 'Unassigned',
        assignedUserId: audit.assigned_user_id,
        isOwnAudit: audit.assigned_user_id === user?.id,
      },
    }));
  }, [audits, user?.id]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { status, isOwnAudit } = event.resource;
    
    let backgroundColor = 'hsl(var(--muted))';
    let borderColor = 'hsl(var(--border))';
    
    if (isOwnAudit) {
      borderColor = 'hsl(var(--primary))';
    }
    
    switch (status) {
      case 'scheduled':
        backgroundColor = 'hsl(var(--primary) / 0.2)';
        break;
      case 'in_progress':
        backgroundColor = 'hsl(217 91% 60% / 0.2)';
        break;
      case 'completed':
        backgroundColor = 'hsl(142 76% 36% / 0.2)';
        break;
      case 'overdue':
        backgroundColor = 'hsl(var(--destructive) / 0.2)';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderLeft: isOwnAudit ? `4px solid ${borderColor}` : `2px solid ${borderColor}`,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'hsl(var(--foreground))',
        padding: '2px 5px',
        fontSize: '0.875rem',
      },
    };
  }, []);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  };

  const handleOpenAudit = () => {
    if (selectedEvent) {
      navigate(`/audit/${selectedEvent.id}`);
    }
  };

  const handleStartAudit = async () => {
    if (selectedEvent) {
      await updateStatus.mutateAsync({
        auditId: selectedEvent.id,
        status: 'in_progress',
      });
      setDetailsDialogOpen(false);
      navigate(`/audit/${selectedEvent.id}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      scheduled: { variant: 'default', label: 'Scheduled' },
      in_progress: { variant: 'secondary', label: 'In Progress' },
      completed: { variant: 'outline', label: 'Completed' },
      overdue: { variant: 'destructive', label: 'Overdue' },
    };

    const config = variants[status] || variants.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canAccessAudit = useMemo(() => {
    if (!selectedEvent) return false;
    return isAdminOrManager || selectedEvent.resource.isOwnAudit;
  }, [selectedEvent, isAdminOrManager]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Audits Calendar</h1>
              <p className="text-muted-foreground">View and manage scheduled audits</p>
            </div>
          </div>
          
          {isAdminOrManager && (
            <Button onClick={() => setScheduleDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Audit
            </Button>
          )}
        </div>

        <Card className="p-6">
          <div className="mb-4 flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--primary) / 0.2)' }} />
              <span className="text-sm">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(217 91% 60% / 0.2)' }} />
              <span className="text-sm">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(142 76% 36% / 0.2)' }} />
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--destructive) / 0.2)' }} />
              <span className="text-sm">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-l-4" style={{ borderLeftColor: 'hsl(var(--primary))' }} />
              <span className="text-sm">Your Audits</span>
            </div>
          </div>

          <div className="h-[600px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              views={['month', 'week', 'day', 'agenda']}
              defaultView="week"
            />
          </div>
        </Card>
      </main>

      <ScheduleAuditDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
      />

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit Details</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{selectedEvent.resource.location}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Template</p>
                <p className="font-medium">{selectedEvent.resource.template}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <p className="font-medium">{selectedEvent.resource.assignedTo}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Schedule</p>
                <p className="font-medium">
                  {moment(selectedEvent.start).format('MMM D, YYYY h:mm A')} - {moment(selectedEvent.end).format('h:mm A')}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {getStatusBadge(selectedEvent.resource.status)}
              </div>

              {!canAccessAudit && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    You can only access audits assigned to you.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {canAccessAudit && (
                  <>
                    {selectedEvent.resource.status === 'scheduled' && (
                      <Button onClick={handleStartAudit} className="flex-1">
                        Start Audit
                      </Button>
                    )}
                    {selectedEvent.resource.status !== 'scheduled' && (
                      <Button onClick={handleOpenAudit} className="flex-1">
                        Open Audit
                      </Button>
                    )}
                  </>
                )}
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditsCalendar;
