import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/UserAvatar";
import { Clock, FileEdit } from "lucide-react";
import { format } from "date-fns";
import { useAuditRevisions } from "@/hooks/useAuditRevisions";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditRevisionHistoryProps {
  auditId: string;
  className?: string;
}

export const AuditRevisionHistory = ({ auditId, className }: AuditRevisionHistoryProps) => {
  const { data: revisions, isLoading } = useAuditRevisions(auditId);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getFieldLabel = (fieldKey: string): string => {
    // Convert field keys to readable labels
    const labels: Record<string, string> = {
      location: 'Location',
      audit_date: 'Audit Date',
      time_start: 'Start Time',
      time_end: 'End Time',
      notes: 'Notes',
      overall_score: 'Overall Score',
      status: 'Status',
      custom_data: 'Field Data',
    };
    return labels[fieldKey] || fieldKey;
  };

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (!revisions || revisions.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <FileEdit className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Revision History</h3>
        </div>
        <p className="text-sm text-muted-foreground">No revisions yet. This audit hasn't been edited.</p>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <FileEdit className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Revision History</h3>
        <Badge variant="secondary">{revisions.length} {revisions.length === 1 ? 'revision' : 'revisions'}</Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {revisions.map((revision) => (
            <div
              key={revision.id}
              className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <UserAvatar
                  avatarUrl={revision.profiles?.avatar_url}
                  userName={revision.profiles?.full_name}
                  userEmail={revision.profiles?.email}
                  size="sm"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">
                      {revision.profiles?.full_name || revision.profiles?.email || 'Unknown User'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Rev #{revision.revision_number}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(revision.changed_at), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>

              {revision.change_summary && (
                <p className="text-sm text-muted-foreground mb-3 italic">
                  {revision.change_summary}
                </p>
              )}

              <div className="space-y-2">
                {Object.entries(revision.changes).map(([fieldKey, change]) => (
                  <div
                    key={fieldKey}
                    className="text-sm p-2 rounded bg-secondary/30"
                  >
                    <div className="font-medium text-foreground mb-1">
                      {getFieldLabel(fieldKey)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">From: </span>
                        <span className="text-destructive line-through">
                          {formatValue(change.old)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">To: </span>
                        <span className="text-success font-medium">
                          {formatValue(change.new)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
