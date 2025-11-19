import { useState } from "react";
import { Header } from "@/components/Header";
import { NotificationDetailDialog } from "@/components/NotificationDetailDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { NotificationPreview } from "@/components/NotificationPreview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotificationTemplates } from "@/hooks/useNotificationTemplates";
import { useLocationAudits } from "@/hooks/useAudits";
import { Plus, Megaphone, Trash2, Clock, Calendar as CalendarIcon, FileText, Eye, History, BarChart3, RefreshCw, MapPin, CheckCheck, HelpCircle, Info, Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { format, isFuture } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function Notifications() {
  const { user } = useAuth();
  const { data: roleData, isLoading: isLoadingRole } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "announcement">("info");
  const [targetRoles, setTargetRoles] = useState<string[]>(["checker", "manager", "admin"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [auditId, setAuditId] = useState<string>("");
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { templates } = useNotificationTemplates();
  const { data: audits = [] } = useLocationAudits();
  const { markAsRead, markAllAsRead, readNotifications, isMarkingAllAsRead } = useNotifications();

  console.log('[Notifications] Loading role:', isLoadingRole, 'Role data:', roleData);

  const { data: notifications = [] } = useQuery({
    queryKey: ['all_notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          location_audits:audit_id (
            id,
            location,
            audit_date
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Managers can only create notifications for checkers
      if (roleData?.isManager && !roleData?.isAdmin) {
        if (!targetRoles.every(role => role === 'checker')) {
          throw new Error('Managers can only create notifications for Checkers');
        }
      }

      const notificationData: any = {
        title,
        message,
        type,
        target_roles: targetRoles,
        created_by: user.id,
        expires_at: expiresAt || null,
        scheduled_for: scheduledFor || null,
        recurrence_enabled: recurrenceEnabled,
        recurrence_pattern: recurrenceEnabled ? recurrencePattern : 'none',
        audit_id: auditId || null,
      };

      // If recurring, set next_scheduled_at to the scheduled_for time or now
      if (recurrenceEnabled) {
        const startTime = scheduledFor ? new Date(scheduledFor) : new Date();
        notificationData.next_scheduled_at = startTime.toISOString();
      }

      const { error } = await supabase.from('notifications').insert(notificationData);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notification created",
        description: "Your notification has been sent successfully.",
      });
      setTitle("");
      setMessage("");
      setType("info");
      setTargetRoles(["checker", "manager", "admin"]);
      setExpiresAt("");
      setScheduledFor("");
      setRecurrenceEnabled(false);
      setRecurrencePattern("none");
      setAuditId("");
      queryClient.invalidateQueries({ queryKey: ['all_notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notification deleted",
        description: "The notification has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['all_notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleRoleToggle = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    if (targetRoles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one target role.",
        variant: "destructive",
      });
      return;
    }
    if (scheduledFor && new Date(scheduledFor) < new Date()) {
      toast({
        title: "Validation Error",
        description: "Scheduled publish time cannot be in the past.",
        variant: "destructive",
      });
      return;
    }
    if (expiresAt && scheduledFor && new Date(expiresAt) <= new Date(scheduledFor)) {
      toast({
        title: "Validation Error",
        description: "Expiration time must be after the scheduled publish time.",
        variant: "destructive",
      });
      return;
    }
    createNotificationMutation.mutate();
  };

  if (isLoadingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!roleData?.isAdmin && !roleData?.isManager) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to manage notifications.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Megaphone className="h-8 w-8" />
                  Manage Notifications
                </h1>
                <p className="text-muted-foreground">
                  Create and manage in-app notifications for users
                </p>
              </div>
              {roleData?.isAdmin && (
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" asChild>
                    <a href="/recurring-notifications">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Recurring
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/notification-analytics">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/notification-audit-logs">
                      <History className="h-4 w-4 mr-2" />
                      Audit Logs
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/notification-templates">
                      <FileText className="h-4 w-4 mr-2" />
                      Templates
                    </a>
                  </Button>
                </div>
              )}
            </div>

          <Card>
            <CardHeader>
              <CardTitle>Create New Notification</CardTitle>
              <CardDescription>
                Send announcements, updates, or important messages to users based on their roles. 
                You can schedule notifications to publish automatically at a future date and time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Permission Summary Banner */}
                <Alert className="bg-primary/5 border-primary/20">
                  <Shield className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <strong>Your notification permissions:</strong>{" "}
                    {roleData?.isAdmin ? (
                      <span>You can send notifications to <strong>all roles</strong> (Checkers, Managers, and Admins).</span>
                    ) : roleData?.isManager ? (
                      <span>You can send notifications to <strong>Checkers only</strong>. Contact an administrator to notify Managers or Admins.</span>
                    ) : (
                      <span>You can send notifications to <strong>Checkers only</strong>.</span>
                    )}
                  </AlertDescription>
                </Alert>
                
                {templates.length > 0 && (
                  <div className="space-y-2 pb-4 border-b">
                    <Label htmlFor="template" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Use Template (Optional)
                    </Label>
                    <Select
                      onValueChange={(templateId) => {
                        const template = templates.find(t => t.id === templateId);
                        if (template) {
                          setTitle(template.title);
                          setMessage(template.message);
                          setType(template.type);
                          setTargetRoles(template.target_roles);
                          toast({
                            title: "Template loaded",
                            description: `Loaded "${template.name}" template. You can modify it before sending.`,
                          });
                        }
                      }}
                    >
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select a saved template to quickly populate the form
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="New Feature Available"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message * (Rich Text)</Label>
                  <RichTextEditor
                    value={message}
                    onChange={setMessage}
                    placeholder="We've added a new reporting feature to help you track compliance..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={type} onValueChange={(value: any) => setType(value)}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduledFor" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Schedule Publish Time (Optional)
                    </Label>
                    <Input
                      id="scheduledFor"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      placeholder="Leave empty to publish immediately"
                    />
                    <p className="text-xs text-muted-foreground">
                      Notification will only be visible after this time
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auditId">Link to Audit (Optional)</Label>
                  <Select value={auditId} onValueChange={setAuditId}>
                    <SelectTrigger id="auditId">
                      <SelectValue placeholder="Select an audit to announce..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {audits.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No audits available
                        </div>
                      ) : (
                        audits.map((audit) => (
                          <SelectItem key={audit.id} value={audit.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {audit.location} - {format(new Date(audit.audit_date), 'MMM dd, yyyy')}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this notification to a specific audit
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt" className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Expires At (Optional)
                  </Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Notification will automatically hide after this time
                  </p>
                </div>

                <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recurring"
                      checked={recurrenceEnabled}
                      onCheckedChange={(checked) => setRecurrenceEnabled(checked as boolean)}
                    />
                    <Label htmlFor="recurring" className="cursor-pointer font-semibold">
                      Enable Recurring Notification
                    </Label>
                  </div>
                  
                  {recurrenceEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="recurrencePattern">Recurrence Pattern *</Label>
                        <Select
                          value={recurrencePattern}
                          onValueChange={(value: "none" | "daily" | "weekly" | "monthly") => setRecurrencePattern(value)}
                        >
                          <SelectTrigger id="recurrencePattern">
                            <SelectValue placeholder="Select recurrence pattern" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Notification will be automatically sent at the scheduled time according to this pattern
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground bg-info/10 p-3 rounded border border-info/20">
                        <strong>Note:</strong> The first notification will be sent at the "Scheduled For" time (or immediately if not set). 
                        Subsequent notifications will repeat based on the selected pattern.
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Target Roles *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-semibold">Role Hierarchy & Permissions:</p>
                            <ul className="space-y-1 text-xs">
                              <li className="flex items-start gap-1">
                                <span className="font-semibold">Admins:</span>
                                <span>Can send notifications to all roles (Checkers, Managers, and Admins)</span>
                              </li>
                              <li className="flex items-start gap-1">
                                <span className="font-semibold">Managers:</span>
                                <span>Can only send notifications to Checkers</span>
                              </li>
                              <li className="flex items-start gap-1">
                                <span className="font-semibold">Checkers:</span>
                                <span>Can only send notifications to Checkers</span>
                              </li>
                            </ul>
                            <p className="text-xs text-muted-foreground pt-1 border-t">
                              Select one or more target roles for your notification. Recipients will receive the notification in their notification center.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="checker"
                        checked={targetRoles.includes("checker")}
                        onCheckedChange={() => handleRoleToggle("checker")}
                      />
                      <Label htmlFor="checker" className="cursor-pointer">
                        Checkers
                      </Label>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="manager"
                              checked={targetRoles.includes("manager")}
                              onCheckedChange={() => handleRoleToggle("manager")}
                              disabled={roleData?.isManager && !roleData?.isAdmin}
                            />
                            <Label 
                              htmlFor="manager" 
                              className={cn(
                                roleData?.isManager && !roleData?.isAdmin 
                                  ? "cursor-not-allowed opacity-50" 
                                  : "cursor-pointer"
                              )}
                            >
                              Managers
                            </Label>
                          </div>
                        </TooltipTrigger>
                        {roleData?.isManager && !roleData?.isAdmin && (
                          <TooltipContent>
                            <p>Only administrators can send notifications to managers</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="admin"
                              checked={targetRoles.includes("admin")}
                              onCheckedChange={() => handleRoleToggle("admin")}
                              disabled={roleData?.isManager && !roleData?.isAdmin}
                            />
                            <Label 
                              htmlFor="admin" 
                              className={cn(
                                roleData?.isManager && !roleData?.isAdmin 
                                  ? "cursor-not-allowed opacity-50" 
                                  : "cursor-pointer"
                              )}
                            >
                              Admins
                            </Label>
                          </div>
                        </TooltipTrigger>
                        {roleData?.isManager && !roleData?.isAdmin && (
                          <TooltipContent>
                            <p>Only administrators can send notifications to other admins</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {roleData?.isManager && !roleData?.isAdmin && (
                    <p className="text-xs text-muted-foreground">
                      As a Manager, you can only send notifications to Checkers
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewOpen(true)}
                    className="flex-1 md:flex-none"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    type="submit"
                    disabled={createNotificationMutation.isPending}
                    className="flex-1 md:flex-none"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createNotificationMutation.isPending ? "Creating..." : "Create Notification"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Notification Preview</DialogTitle>
                <DialogDescription>
                  See how your notification will appear to users
                </DialogDescription>
              </DialogHeader>
              <NotificationPreview
                title={title}
                message={message}
                type={type}
                targetRoles={targetRoles}
              />
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Existing Notifications</CardTitle>
                  <CardDescription>Manage previously created notifications</CardDescription>
                </div>
                {notifications.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => markAllAsRead()}
                    disabled={isMarkingAllAsRead}
                    className="flex items-center gap-2"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Mark All as Read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No notifications created yet
                </p>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => {
                    const isRead = readNotifications.some(read => read.notification_id === notification.id);
                    return (
                    <div
                      key={notification.id}
                      className={cn(
                        "border rounded-lg p-4 flex items-start justify-between gap-4 cursor-pointer hover:shadow-md transition-all group",
                        !isRead ? "bg-accent/50 hover:bg-accent/70 border-primary/30" : "hover:bg-accent/30"
                      )}
                      onClick={() => {
                        setSelectedNotification(notification);
                        setDetailOpen(true);
                        if (!isRead) {
                          markAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {!isRead && (
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          )}
                          <h3 className={cn(
                            "font-semibold group-hover:text-primary transition-colors",
                            !isRead && "text-primary"
                          )}>{notification.title}</h3>
                          <Badge variant="outline">{notification.type}</Badge>
                          {!notification.is_active && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                          {notification.scheduled_for && isFuture(new Date(notification.scheduled_for)) && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Scheduled
                            </Badge>
                          )}
                          <Eye className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          <span dangerouslySetInnerHTML={{ __html: notification.message }} />
                        </p>
                        {notification.location_audits && (
                          <div className="flex items-center gap-1 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-md mb-2 w-fit">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">
                              Linked Audit: {notification.location_audits.location} - {format(new Date(notification.location_audits.audit_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>
                            Created: {format(new Date(notification.created_at), "PPp")}
                          </span>
                          {notification.scheduled_for && (
                            <span className={isFuture(new Date(notification.scheduled_for)) ? "text-primary font-medium" : ""}>
                              • {isFuture(new Date(notification.scheduled_for)) ? "Publishes" : "Published"}: {format(new Date(notification.scheduled_for), "PPp")}
                            </span>
                          )}
                          {notification.expires_at && (
                            <span>
                              • Expires: {format(new Date(notification.expires_at), "PPp")}
                            </span>
                          )}
                          <span>
                            • Roles:{" "}
                            {notification.target_roles
                              .map((r: string) => r.charAt(0).toUpperCase() + r.slice(1))
                              .join(", ")}
                          </span>
                        </div>
                      </div>
                      {roleData?.isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this notification? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteNotificationMutation.mutate(notification.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
          <NotificationDetailDialog
            notification={selectedNotification}
            open={detailOpen}
            onOpenChange={setDetailOpen}
          />
        </div>
      </div>
    </div>
  );
}
