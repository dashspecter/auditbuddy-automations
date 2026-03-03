import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ScheduledAuditItem, CompletedAuditItem } from '@/hooks/useMobileCommandData';

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color = score >= 80 ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    : score >= 60 ? 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30'
    : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
  return (
    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', color)}>
      {score}%
    </span>
  );
}

interface Props {
  scheduled: ScheduledAuditItem[] | undefined;
  completed: CompletedAuditItem[] | undefined;
  isLoading: boolean;
}

export const TodayAuditsSection = ({ scheduled, completed, isLoading }: Props) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-36" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const scheduledItems = scheduled ?? [];
  const completedItems = completed ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" />
          Today's Audits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scheduled */}
        {scheduledItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              <Calendar className="h-3 w-3 inline mr-1" />
              Scheduled ({scheduledItems.length})
            </p>
            <div className="space-y-2">
              {scheduledItems.map(item => (
                <div key={item.id} className="flex items-start justify-between text-sm border-l-2 border-primary/30 pl-3 py-1">
                  <div>
                    <p className="font-medium text-foreground">{item.templateName}</p>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {item.locationName} · {item.assignedTo}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.scheduledFor), 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completedItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              ✅ Completed ({completedItems.length})
            </p>
            <div className="space-y-2">
              {completedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm border-l-2 border-muted pl-3 py-1">
                  <div>
                    <p className="font-medium text-foreground">{item.templateName}</p>
                    <p className="text-muted-foreground text-xs">
                      <MapPin className="h-3 w-3 inline mr-1" />{item.locationName}
                    </p>
                  </div>
                  <ScoreBadge score={item.overallScore} />
                </div>
              ))}
            </div>
          </div>
        )}

        {scheduledItems.length === 0 && completedItems.length === 0 && (
          <p className="text-sm text-muted-foreground">No audits scheduled or completed today</p>
        )}
      </CardContent>
    </Card>
  );
};
