import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, Info, AlertTriangle, Megaphone, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const StaffNotificationsCard = () => {
  const { unreadNotifications, markAsRead, isLoading } = useNotifications();

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (unreadNotifications.length === 0) {
    return null;
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'announcement':
        return <Megaphone className="h-5 w-5 text-primary" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Success</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Warning</Badge>;
      case 'announcement':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Announcement</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Info</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Notifications</h2>
        <Badge variant="secondary" className="ml-auto">
          {unreadNotifications.length} new
        </Badge>
      </div>
      
      <div className="space-y-2">
        {unreadNotifications.slice(0, 5).map((notification) => (
          <Card 
            key={notification.id} 
            className={cn(
              "p-4 relative border-l-4",
              notification.type === 'warning' && "border-l-amber-500",
              notification.type === 'success' && "border-l-green-500",
              notification.type === 'announcement' && "border-l-primary",
              notification.type === 'info' && "border-l-blue-500"
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => markAsRead(notification.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex items-start gap-3 pr-8">
              {getTypeIcon(notification.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm truncate">{notification.title}</h3>
                  {getTypeBadge(notification.type)}
                </div>
                <div 
                  className="text-sm text-muted-foreground line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: notification.message }}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(notification.created_at), "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
