import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart3, ChevronDown, AlertTriangle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeeklyAuditSummaryData } from '@/hooks/useMobileCommandData';

interface Props {
  data: WeeklyAuditSummaryData | undefined;
  isLoading: boolean;
}

export const WeeklyAuditSummarySection = ({ data, isLoading }: Props) => {
  const [open, setOpen] = useState(true);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const summary = data ?? { totalCompleted: 0, averageScore: 0, locationsCount: 0, negativeAudits: [] };
  const scoreColor = summary.averageScore >= 80 ? 'text-green-600' : summary.averageScore >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                This Week
              </span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted/50 rounded-lg py-2 px-1">
                <p className="text-lg font-bold text-foreground">{summary.totalCompleted}</p>
                <p className="text-xs text-muted-foreground">Audits</p>
              </div>
              <div className="bg-muted/50 rounded-lg py-2 px-1">
                <p className={cn('text-lg font-bold', scoreColor)}>{summary.averageScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
              <div className="bg-muted/50 rounded-lg py-2 px-1">
                <p className="text-lg font-bold text-foreground">{summary.locationsCount}</p>
                <p className="text-xs text-muted-foreground">Locations</p>
              </div>
            </div>

            {/* Negative audits */}
            {summary.negativeAudits.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Attention needed ({summary.negativeAudits.length})
                </p>
                <div className="space-y-1.5">
                  {summary.negativeAudits.map(audit => (
                    <div key={audit.id} className="flex items-center justify-between text-sm bg-destructive/5 rounded-md px-3 py-1.5">
                      <span className="text-foreground">
                        <MapPin className="h-3 w-3 inline mr-1 text-muted-foreground" />
                        {audit.locationName} — {audit.templateName}
                      </span>
                      <span className="text-red-600 font-semibold text-xs">{audit.overallScore}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.totalCompleted === 0 && (
              <p className="text-sm text-muted-foreground">No audits completed this week yet</p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
