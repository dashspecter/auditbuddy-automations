import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationHistoryDialogProps {
  notification: {
    id: string;
    title: string;
    created_by: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoryNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  target_roles: string[];
  created_at: string;
}

export const NotificationHistoryDialog = ({
  notification,
  open,
  onOpenChange,
}: NotificationHistoryDialogProps) => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['notification_history', notification.id],
    queryFn: async () => {
      // Fetch all notifications with the same title and created_by, and recurrence_pattern = 'none'
      // These are the instances created from the recurring notification
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, type, target_roles, created_at')
        .eq('title', notification.title)
        .eq('created_by', notification.created_by)
        .eq('recurrence_pattern', 'none')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HistoryNotification[];
    },
    enabled: open,
  });

  // Fetch read counts for each notification
  const { data: readCounts = {} } = useQuery({
    queryKey: ['notification_read_counts', history.map(h => h.id)],
    queryFn: async () => {
      if (history.length === 0) return {};
      
      const counts: Record<string, number> = {};
      
      for (const notif of history) {
        const { count, error } = await supabase
          .from('notification_reads')
          .select('*', { count: 'exact', head: true })
          .eq('notification_id', notif.id);

        if (!error && count !== null) {
          counts[notif.id] = count;
        }
      }
      
      return counts;
    },
    enabled: open && history.length > 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Delivery History</DialogTitle>
          <DialogDescription>
            All notification instances sent from "{notification.title}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No delivery history yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Instances will appear here once they're sent
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="border border-border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-semibold">{item.title}</h4>
                        <Badge variant="outline" className="capitalize text-xs">
                          {item.type}
                        </Badge>
                      </div>
                      
                      <div
                        className="text-sm text-muted-foreground line-clamp-2 mb-2"
                        dangerouslySetInnerHTML={{ __html: item.message }}
                      />

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Sent: {format(new Date(item.created_at), 'PPp')}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>Roles: {item.target_roles.join(', ')}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{readCounts[item.id] || 0} reads</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
