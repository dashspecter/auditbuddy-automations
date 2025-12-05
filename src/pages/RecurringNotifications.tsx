import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Pause, Play, Trash2, Calendar, Clock, RefreshCw, FileText, History as HistoryIcon, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EditRecurringNotificationDialog } from "@/components/EditRecurringNotificationDialog";
import { NotificationHistoryDialog } from "@/components/NotificationHistoryDialog";
import { RoleGuard } from "@/components/RoleGuard";
import { useEmployees } from "@/hooks/useEmployees";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RecurringNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  target_roles: string[];
  target_employee_ids?: string[];
  recurrence_pattern: string;
  recurrence_enabled: boolean;
  next_scheduled_at: string | null;
  last_sent_at: string | null;
  created_at: string;
}

const getRecurrenceColor = (pattern: string) => {
  switch (pattern) {
    case 'daily':
      return 'bg-info/20 text-info border-info/30';
    case 'weekly':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'monthly':
      return 'bg-primary/20 text-primary border-primary/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getStatusColor = (enabled: boolean) => {
  return enabled
    ? 'bg-success/20 text-success border-success/30'
    : 'bg-destructive/20 text-destructive border-destructive/30';
};

export default function RecurringNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState<{ open: boolean; notification: any | null }>({ open: false, notification: null });
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; notification: any | null }>({ open: false, notification: null });
  const { data: employees = [] } = useEmployees();

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.full_name || 'Unknown';
  };

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['recurring_notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .neq('recurrence_pattern', 'none')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RecurringNotification[];
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ recurrence_enabled: enabled })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.enabled ? "Recurring notification resumed" : "Recurring notification paused",
        description: variables.enabled
          ? "The notification schedule will continue as planned."
          : "The notification schedule has been paused and will not send until resumed.",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring_notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({
          recurrence_enabled: false,
          recurrence_pattern: 'none',
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Recurring notification cancelled",
        description: "The notification schedule has been permanently cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring_notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activeNotifications = notifications.filter(n => n.recurrence_enabled);
  const pausedNotifications = notifications.filter(n => !n.recurrence_enabled);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/notifications">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Recurring Notifications</h1>
            <p className="text-muted-foreground">Loading schedules...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requireManager fallbackMessage="You don't have permission to manage recurring notifications.">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/notifications">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Recurring Notifications</h1>
            <p className="text-muted-foreground">Manage automated notification schedules</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notifications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Play className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{activeNotifications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paused</CardTitle>
              <Pause className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pausedNotifications.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Schedules */}
        {activeNotifications.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-success" />
                Active Schedules
              </CardTitle>
              <CardDescription>Currently running recurring notification schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="border border-border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{notification.title}</h3>
                          <Badge className={getRecurrenceColor(notification.recurrence_pattern)}>
                            {notification.recurrence_pattern}
                          </Badge>
                          <Badge className={getStatusColor(notification.recurrence_enabled)}>
                            Active
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {notification.type}
                          </Badge>
                        </div>
                        
                        <div
                          className="text-sm text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(notification.message) }}
                        />

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              Next: {notification.next_scheduled_at
                                ? format(new Date(notification.next_scheduled_at), 'PPp')
                                : 'Not scheduled'}
                            </span>
                          </div>
                          {notification.last_sent_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Last: {format(new Date(notification.last_sent_at), 'PPp')}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <Users className="h-4 w-4" />
                          <span>Target Employees:</span>
                          {notification.target_employee_ids && notification.target_employee_ids.length > 0 ? (
                            notification.target_employee_ids.slice(0, 3).map((empId) => (
                              <Badge key={empId} variant="secondary" className="text-xs">
                                {getEmployeeName(empId)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">No employees selected</span>
                          )}
                          {notification.target_employee_ids && notification.target_employee_ids.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{notification.target_employee_ids.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditDialog({ open: true, notification })}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setHistoryDialog({ open: true, notification })}
                        >
                          <HistoryIcon className="h-4 w-4 mr-2" />
                          History
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: notification.id,
                              enabled: false,
                            })
                          }
                          disabled={toggleStatusMutation.isPending}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Recurring Notification?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently stop "{notification.title}" from sending. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Schedule</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelMutation.mutate(notification.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Cancel Schedule
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paused Schedules */}
        {pausedNotifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pause className="h-5 w-5 text-warning" />
                Paused Schedules
              </CardTitle>
              <CardDescription>Temporarily paused recurring notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pausedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="border border-border rounded-lg p-4 space-y-3 bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{notification.title}</h3>
                          <Badge className={getRecurrenceColor(notification.recurrence_pattern)}>
                            {notification.recurrence_pattern}
                          </Badge>
                          <Badge className={getStatusColor(notification.recurrence_enabled)}>
                            Paused
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {notification.type}
                          </Badge>
                        </div>
                        
                        <div
                          className="text-sm text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(notification.message) }}
                        />

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {notification.last_sent_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Last sent: {format(new Date(notification.last_sent_at), 'PPp')}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <Users className="h-4 w-4" />
                          <span>Target Employees:</span>
                          {notification.target_employee_ids && notification.target_employee_ids.length > 0 ? (
                            notification.target_employee_ids.slice(0, 3).map((empId) => (
                              <Badge key={empId} variant="secondary" className="text-xs">
                                {getEmployeeName(empId)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">No employees selected</span>
                          )}
                          {notification.target_employee_ids && notification.target_employee_ids.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{notification.target_employee_ids.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditDialog({ open: true, notification })}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setHistoryDialog({ open: true, notification })}
                        >
                          <HistoryIcon className="h-4 w-4 mr-2" />
                          History
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: notification.id,
                              enabled: true,
                            })
                          }
                          disabled={toggleStatusMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Resume
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Recurring Notification?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove "{notification.title}" from your schedules. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Schedule</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelMutation.mutate(notification.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Cancel Schedule
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {notifications.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Recurring Notifications</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                You haven't created any recurring notifications yet. Create one to automatically send notifications on a schedule.
              </p>
              <Button asChild>
                <Link to="/notifications">
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Recurring Notification
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        {editDialog.notification && (
          <EditRecurringNotificationDialog
            notification={editDialog.notification}
            open={editDialog.open}
            onOpenChange={(open) => setEditDialog({ open, notification: editDialog.notification })}
          />
        )}

        {/* History Dialog */}
        {historyDialog.notification && (
          <NotificationHistoryDialog
            notification={historyDialog.notification}
            open={historyDialog.open}
            onOpenChange={(open) => setHistoryDialog({ open, notification: historyDialog.notification })}
          />
        )}
      </div>
    </RoleGuard>
  );
}
