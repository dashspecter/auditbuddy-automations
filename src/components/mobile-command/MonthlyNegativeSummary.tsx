import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, MapPin, Clock, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { MonthlyNegativeData } from '@/hooks/useMobileCommandData';

interface Props {
  data: MonthlyNegativeData | undefined;
  isLoading: boolean;
}

const severityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: 'bg-red-100 text-red-700', label: 'Critical' },
  high: { color: 'bg-red-50 text-red-600', label: 'High' },
  medium: { color: 'bg-amber-50 text-amber-700', label: 'Medium' },
  low: { color: 'bg-muted text-muted-foreground', label: 'Low' },
};

export const MonthlyNegativeSummarySection = ({ data, isLoading }: Props) => {
  const [open, setOpen] = useState(true);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  const summary = data ?? { lowScoreByLocation: [], openCAList: [], lateEmployees: [] };
  const hasIssues = summary.lowScoreByLocation.length > 0 || summary.openCAList.length > 0 || summary.lateEmployees.length > 0;

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                30-Day Attention
              </span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {!hasIssues ? (
              <p className="text-sm text-muted-foreground">✅ No attention items — everything looks good!</p>
            ) : (
              <div className="space-y-4">
                {/* Low score locations */}
                {summary.lowScoreByLocation.length > 0 && (
                  <div className="space-y-2">
                    {summary.lowScoreByLocation.map(loc => (
                      <div key={loc.locationName} className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                        <span>
                          <strong>{loc.locationName}</strong> — avg <span className="text-red-600 font-semibold">{loc.avgScore}%</span> across {loc.count} audit{loc.count > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Corrective actions — detailed list */}
                {summary.openCAList.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                      <FileWarning className="h-3 w-3" />
                      Open Corrective Actions ({summary.openCAList.length})
                    </p>
                    <div className="space-y-1.5">
                      {summary.openCAList.map(ca => {
                        const sev = severityConfig[ca.severity] ?? severityConfig.medium;
                        return (
                          <div key={ca.id} className="flex items-start gap-2 text-sm bg-muted/30 rounded-md px-3 py-2">
                            <span className={cn('text-[10px] font-semibold rounded px-1.5 py-0.5 shrink-0 mt-0.5', sev.color)}>
                              {sev.label}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground font-medium truncate">{ca.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {ca.locationName}
                                {ca.isOverdue && (
                                  <span className="text-red-600 font-semibold ml-1">
                                    · overdue {ca.dueAt ? format(new Date(ca.dueAt), 'MMM d') : ''}
                                  </span>
                                )}
                                {!ca.isOverdue && ca.dueAt && (
                                  <span className="ml-1">· due {format(new Date(ca.dueAt), 'MMM d')}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Late employees */}
                {summary.lateEmployees.length > 0 && (
                  <div className="space-y-2">
                    {summary.lateEmployees.map(emp => (
                      <div key={emp.name} className="flex items-start gap-2 text-sm">
                        <Clock className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                        <span>
                          <strong>{emp.name}</strong> — {emp.lateCount} late arrivals
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
