import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { useScheduledAuditsNew } from '@/hooks/useScheduledAuditsNew';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Plus, Calendar as CalendarIcon, Play, AlertCircle, X, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
    templateType: string;
    assignedTo: string;
    assignedUserId: string;
    isOwnAudit: boolean;
    source?: 'location_audits' | 'scheduled_audits';
  };
}

const AuditsCalendar = () => {
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const { data: audits, isLoading } = useScheduledAudits();
  const { data: scheduledAuditsNew, isLoading: isLoadingNew } = useScheduledAuditsNew();
  const updateStatus = useUpdateAuditStatus();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRegeneratePrompt, setShowRegeneratePrompt] = useState(false);
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const isAdminOrManager = roleData?.isAdmin || roleData?.isManager;

  const events: CalendarEvent[] = useMemo(() => {
    const eventsFromLocationAudits = (audits || []).map((audit) => ({
      id: audit.id,
      title: `${audit.locations?.name || audit.location} - ${audit.audit_templates?.name || 'Unknown Template'}`,
      start: new Date(audit.scheduled_start),
      end: new Date(audit.scheduled_end),
      resource: {
        status: audit.status,
        location: audit.locations?.name || audit.location,
        template: audit.audit_templates?.name || 'Unknown Template',
        templateType: audit.audit_templates?.template_type || 'location',
        assignedTo: audit.profiles?.full_name || audit.profiles?.email || 'Unassigned',
        assignedUserId: audit.assigned_user_id,
        isOwnAudit: audit.assigned_user_id === user?.id,
        source: 'location_audits' as const,
      },
    }));

    // Add scheduled audits from the scheduled_audits table, expanding recurring ones
    const eventsFromScheduledAudits: CalendarEvent[] = [];
    const today = new Date();
    const futureLimit = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days ahead

    (scheduledAuditsNew || []).forEach((audit) => {
      const baseDate = new Date(audit.scheduled_for);
      const frequency = audit.frequency || 'one-time';
      const title = `${audit.locations?.name || 'Unknown Location'} - ${audit.audit_templates?.name || 'Unknown Template'}`;
      
      const createEvent = (date: Date, instanceIndex: number): CalendarEvent => {
        const endDate = new Date(date.getTime() + 60 * 60 * 1000); // 1 hour duration
        return {
          id: `scheduled-${audit.id}-${instanceIndex}`,
          title,
          start: date,
          end: endDate,
          resource: {
            status: audit.status,
            location: audit.locations?.name || 'Unknown Location',
            template: audit.audit_templates?.name || 'Unknown Template',
            templateType: 'location',
            assignedTo: 'Assigned',
            assignedUserId: audit.assigned_to,
            isOwnAudit: audit.assigned_to === user?.id,
            source: 'scheduled_audits' as const,
          },
        };
      };

      if (frequency === 'one-time') {
        eventsFromScheduledAudits.push(createEvent(baseDate, 0));
      } else {
        // Generate recurring events
        let currentDate = new Date(baseDate);
        let instanceIndex = 0;
        
        while (currentDate <= futureLimit && instanceIndex < 100) {
          if (currentDate >= today || instanceIndex === 0) {
            eventsFromScheduledAudits.push(createEvent(new Date(currentDate), instanceIndex));
          }
          
          // Move to next occurrence
          switch (frequency) {
            case 'daily':
              currentDate.setDate(currentDate.getDate() + 1);
              break;
            case 'weekly':
              currentDate.setDate(currentDate.getDate() + 7);
              break;
            case 'monthly':
              currentDate.setMonth(currentDate.getMonth() + 1);
              break;
            default:
              currentDate = new Date(futureLimit.getTime() + 1); // Exit loop
          }
          instanceIndex++;
        }
      }
    });

    return [...eventsFromLocationAudits, ...eventsFromScheduledAudits];
  }, [audits, scheduledAuditsNew, user?.id]);

  // Detect overlapping events (more than 3 events in same day)
  const hasOverlappingEvents = useMemo(() => {
    if (!events || events.length === 0) return false;
    
    const eventsByDay: Record<string, number> = {};
    events.forEach(event => {
      const dayKey = moment(event.start).format('YYYY-MM-DD');
      eventsByDay[dayKey] = (eventsByDay[dayKey] || 0) + 1;
    });
    
    return Object.values(eventsByDay).some(count => count > 3);
  }, [events]);

  // Auto-switch to list view on mobile when overlapping
  useEffect(() => {
    if (isMobile && hasOverlappingEvents) {
      setViewMode('list');
    } else if (!isMobile) {
      setViewMode('calendar');
    }
  }, [isMobile, hasOverlappingEvents]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { status, isOwnAudit, templateType } = event.resource;
    
    let backgroundColor = 'hsl(var(--muted))';
    let borderColor = 'hsl(var(--border))';
    
    if (isOwnAudit) {
      borderColor = 'hsl(var(--primary))';
    }
    
    // Different base colors for location vs staff audits
    const isStaffAudit = templateType === 'staff';
    
    switch (status) {
      case 'scheduled':
        backgroundColor = isStaffAudit 
          ? 'hsl(280 65% 60% / 0.2)' // Purple for staff
          : 'hsl(var(--primary) / 0.2)'; // Primary for location
        break;
      case 'in_progress':
        backgroundColor = isStaffAudit
          ? 'hsl(280 65% 60% / 0.3)' // Darker purple for staff
          : 'hsl(217 91% 60% / 0.2)'; // Blue for location
        break;
      case 'completed':
        backgroundColor = isStaffAudit
          ? 'hsl(280 65% 60% / 0.15)' // Light purple for staff
          : 'hsl(142 76% 36% / 0.2)'; // Green for location
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
      // Handle scheduled audits from scheduled_audits table
      if (selectedEvent.resource.source === 'scheduled_audits') {
        // Extract the actual ID (remove 'scheduled-' prefix)
        const actualId = selectedEvent.id.replace('scheduled-', '');
        // Navigate to start a new audit with this scheduled audit's details
        navigate(`/location-audit?scheduled=${actualId}`);
        return;
      }
      
      // For completed audits (compliant/non-compliant), go to detail view
      // For incomplete audits (draft/pending/scheduled/in_progress), go to edit form
      const isCompleted = selectedEvent.resource.status === 'compliant' || 
                         selectedEvent.resource.status === 'non-compliant' ||
                         selectedEvent.resource.status === 'completed';
      
      if (isCompleted) {
        navigate(`/audits/${selectedEvent.id}`);
      } else {
        navigate(`/location-audit?draft=${selectedEvent.id}`);
      }
    }
  };

  const handleStartAudit = async () => {
    if (selectedEvent) {
      // Handle scheduled audits from scheduled_audits table
      if (selectedEvent.resource.source === 'scheduled_audits') {
        const actualId = selectedEvent.id.replace('scheduled-', '');
        setDetailsDialogOpen(false);
        navigate(`/location-audit?scheduled=${actualId}`);
        return;
      }
      
      await updateStatus.mutateAsync({
        auditId: selectedEvent.id,
        status: 'in_progress',
      });
      setDetailsDialogOpen(false);
      // Go to edit form to fill out the audit
      navigate(`/location-audit?draft=${selectedEvent.id}`);
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

  // Check if we need to regenerate audits (when furthest audit is within 2 weeks)
  useEffect(() => {
    if (!audits || audits.length === 0 || !isAdminOrManager || dismissedPrompt) {
      setShowRegeneratePrompt(false);
      return;
    }

    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    // Find the furthest scheduled audit
    const futureAudits = audits.filter(audit => 
      new Date(audit.scheduled_start) > now
    );
    
    if (futureAudits.length === 0) {
      setShowRegeneratePrompt(true);
      return;
    }

    const furthestAudit = futureAudits.reduce((latest, audit) => {
      const auditDate = new Date(audit.scheduled_start);
      const latestDate = new Date(latest.scheduled_start);
      return auditDate > latestDate ? audit : latest;
    });

    const furthestDate = new Date(furthestAudit.scheduled_start);
    
    // Show prompt if furthest audit is within 2 weeks
    setShowRegeneratePrompt(furthestDate <= twoWeeksFromNow);
  }, [audits, isAdminOrManager, dismissedPrompt]);

  const handleGenerateAudits = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You must be logged in to generate audits');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-recurring-audits`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message || 'Audits generated successfully');
        setDismissedPrompt(false); // Reset dismissed state after successful generation
        // Invalidate queries to refresh the calendar
        queryClient.invalidateQueries({ queryKey: ['scheduled_audits'] });
        queryClient.invalidateQueries({ queryKey: ['scheduled-audits-new'] });
        queryClient.invalidateQueries({ queryKey: ['location_audits'] });
      } else {
        toast.error(result.error || 'Failed to generate audits');
      }
    } catch (error) {
      console.error('Error generating audits:', error);
      toast.error('Failed to generate audits');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || isLoadingNew) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Audits Calendar</h1>
              <p className="text-sm sm:text-base text-muted-foreground">View and manage scheduled audits</p>
            </div>
          </div>
          
          {isAdminOrManager && (
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                onClick={handleGenerateAudits}
                disabled={isGenerating}
                className="w-full sm:w-auto"
              >
                <Play className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Generate Audits Now'}</span>
                <span className="sm:hidden">{isGenerating ? 'Generating...' : 'Generate'}</span>
              </Button>
              <Button onClick={() => setScheduleDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Audit
              </Button>
            </div>
          )}
        </div>

        {showRegeneratePrompt && isAdminOrManager && (
          <Alert className="mb-6 border-primary/50 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="flex items-center justify-between">
              <span>Time to Regenerate Audits</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setDismissedPrompt(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription className="mt-2 flex items-center justify-between">
              <span className="text-sm">
                You're running low on scheduled audits for the next period. Would you like to generate audits for the next 8 weeks?
              </span>
              <Button
                onClick={handleGenerateAudits}
                disabled={isGenerating}
                className="ml-4"
                size="sm"
              >
                {isGenerating ? 'Generating...' : 'Generate Now'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isMobile && hasOverlappingEvents && (
          <div className="mb-4 flex gap-2">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="flex-1"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex-1"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
        )}

        <Card className="p-6">
          <div className="mb-4 flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--primary) / 0.2)' }} />
              <span className="text-sm">Location Audit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(280 65% 60% / 0.2)' }} />
              <span className="text-sm">Staff Audit</span>
            </div>
            <div className="h-4 w-px bg-border mx-2" />
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-l-4" style={{ borderLeftColor: 'hsl(var(--primary))' }} />
              <span className="text-sm">Your Audits</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--destructive) / 0.2)' }} />
              <span className="text-sm">Overdue</span>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {events
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                    style={{
                      backgroundColor: eventStyleGetter(event).style.backgroundColor,
                      borderLeftWidth: '4px',
                      borderLeftColor: event.resource.isOwnAudit 
                        ? 'hsl(var(--primary))' 
                        : 'hsl(var(--border))',
                    }}
                    onClick={() => handleSelectEvent(event)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs capitalize",
                              event.resource.templateType === 'staff' 
                                ? "border-purple-500/50" 
                                : "border-primary/50"
                            )}
                          >
                            {event.resource.templateType}
                          </Badge>
                          {getStatusBadge(event.resource.status)}
                        </div>
                        <h4 className="font-medium text-sm truncate">{event.resource.location}</h4>
                        <p className="text-xs text-muted-foreground truncate">{event.resource.template}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{moment(event.start).format('MMM D, h:mm A')}</span>
                          <span>-</span>
                          <span>{moment(event.end).format('h:mm A')}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned: {event.resource.assignedTo}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              {events.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No audits scheduled
                </div>
              )}
            </div>
          ) : (
            <div className="h-[600px] md:h-[600px] h-[500px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleSelectEvent}
                views={['month', 'week', 'day', 'agenda']}
                defaultView={window.innerWidth < 768 ? 'agenda' : 'month'}
                step={30}
                timeslots={2}
                dayLayoutAlgorithm="no-overlap"
              />
            </div>
          )}
        </Card>
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
                <p className="text-sm text-muted-foreground">Audit Type</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {selectedEvent.resource.templateType}
                  </Badge>
                  <span className="font-medium">{selectedEvent.resource.template}</span>
                </div>
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
