import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { MapPin, Calendar, Clock, Users, BellOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { sanitizeHtml } from "@/lib/sanitize";

interface NotificationDetailDialogProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    target_roles: string[];
    created_at: string;
    expires_at: string | null;
    scheduled_for: string | null;
    audit_id?: string | null;
    location_audits?: {
      id: string;
      location: string;
      audit_date: string;
    } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationDetailDialog = ({
  notification,
  open,
  onOpenChange,
}: NotificationDetailDialogProps) => {
  const navigate = useNavigate();
  const { snoozeNotification, isSnoozingNotification } = useNotifications();
  const { toast } = useToast();

  if (!notification) return null;

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'destructive';
      case 'announcement':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const handleViewAudit = () => {
    if (notification.location_audits?.id) {
      navigate(`/audits/${notification.location_audits.id}`);
      onOpenChange(false);
    }
  };

  const handleDismissForToday = async () => {
    try {
      await snoozeNotification(notification.id);
      toast({
        title: "Notification dismissed",
        description: "You won't see this notification again today.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to dismiss notification. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl">{notification.title}</DialogTitle>
            <Badge variant={getTypeBadgeVariant(notification.type)}>
              {notification.type}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Content */}
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(notification.message) }} />
          </div>

          {/* Linked Audit */}
          {notification.audit_id && notification.location_audits && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <MapPin className="h-4 w-4" />
                    <span>Linked Audit</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">{notification.location_audits.location}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(notification.location_audits.audit_date), 'PPP')}</span>
                    </div>
                  </div>
                </div>
                <Button onClick={handleViewAudit} size="sm">
                  View Audit
                </Button>
              </div>
            </div>
          )}

          {/* Audit Access Error */}
          {notification.audit_id && !notification.location_audits && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The linked audit could not be loaded. You may not have permission to view it, or it may have been deleted.
              </AlertDescription>
            </Alert>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">Created</p>
                  <p>{format(new Date(notification.created_at), 'PPp')}</p>
                </div>
              </div>
              
              {notification.scheduled_for && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">Scheduled</p>
                    <p>{format(new Date(notification.scheduled_for), 'PPp')}</p>
                  </div>
                </div>
              )}
              
              {notification.expires_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">Expires</p>
                    <p>{format(new Date(notification.expires_at), 'PPp')}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">Target Roles</p>
                  <div className="flex flex-wrap gap-1">
                    {notification.target_roles.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleDismissForToday}
              disabled={isSnoozingNotification}
            >
              <BellOff className="h-4 w-4 mr-2" />
              Dismiss for today
            </Button>
            {notification.location_audits && (
              <Button onClick={handleViewAudit}>
                View Audit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
