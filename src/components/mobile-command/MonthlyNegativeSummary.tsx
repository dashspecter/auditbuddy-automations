import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, MapPin, Clock, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonthlyNegativeData } from '@/hooks/useMobileCommandData';

interface Props {
  data: MonthlyNegativeData | undefined;
  isLoading: boolean;
}

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

  const summary = data ?? { lowScoreByLocation: [], openCAs: 0, overdueCAs: 0, lateEmployees: [] };
  const hasIssues = summary.lowScoreByLocation.length > 0 || summary.openCAs > 0 || summary.lateEmployees.length > 0;

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
              <ul className="space-y-2.5 text-sm">
                {/* Low score locations */}
                {summary.lowScoreByLocation.map(loc => (
                  <li key={loc.locationName} className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                    <span>
                      <strong>{loc.locationName}</strong> — avg <span className="text-red-600 font-semibold">{loc.avgScore}%</span> across {loc.count} audit{loc.count > 1 ? 's' : ''}
                    </span>
                  </li>
                ))}

                {/* Corrective actions */}
                {summary.openCAs > 0 && (
                  <li className="flex items-start gap-2">
                    <FileWarning className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                    <span>
                      <strong>{summary.openCAs}</strong> open corrective action{summary.openCAs > 1 ? 's' : ''}
                      {summary.overdueCAs > 0 && (
                        <span className="text-red-600 font-semibold"> ({summary.overdueCAs} overdue)</span>
                      )}
                    </span>
                  </li>
                )}

                {/* Late employees */}
                {summary.lateEmployees.map(emp => (
                  <li key={emp.name} className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                    <span>
                      <strong>{emp.name}</strong> — {emp.lateCount} late arrivals
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
