import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ClipboardCheck, LogIn, CheckCircle, Activity } from "lucide-react";

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  metadata: any;
  created_at: string;
}

interface UserActivityDialogProps {
  userId: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'login':
      return <LogIn className="h-4 w-4" />;
    case 'audit_created':
      return <ClipboardCheck className="h-4 w-4" />;
    case 'audit_completed':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'login':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'audit_created':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'audit_completed':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export function UserActivityDialog({ userId, userEmail, open, onOpenChange }: UserActivityDialogProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['user_activity', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activity Log</DialogTitle>
          <DialogDescription>
            Recent activity for {userEmail}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading activity...</p>
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${getActivityColor(activity.activity_type)}`}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {activity.activity_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="mt-2 rounded-md bg-muted p-2 text-xs">
                          {activity.metadata.location && (
                            <div><strong>Location:</strong> {activity.metadata.location}</div>
                          )}
                          {activity.metadata.overall_score && (
                            <div><strong>Score:</strong> {activity.metadata.overall_score}%</div>
                          )}
                          {activity.metadata.status && (
                            <div><strong>Status:</strong> {activity.metadata.status}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {index < activities.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No activity recorded yet</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
