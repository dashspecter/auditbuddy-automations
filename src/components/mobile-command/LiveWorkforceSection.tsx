import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { ClockedInEmployee } from '@/hooks/useMobileCommandData';

interface Props {
  data: ClockedInEmployee[] | undefined;
  isLoading: boolean;
}

export const LiveWorkforceSection = ({ data, isLoading }: Props) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const employees = data ?? [];

  // Group by location
  const byLocation = employees.reduce<Record<string, ClockedInEmployee[]>>((acc, e) => {
    if (!acc[e.locationName]) acc[e.locationName] = [];
    acc[e.locationName].push(e);
    return acc;
  }, {});

  const locationEntries = Object.entries(byLocation);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <Users className="h-4 w-4" />
          Live Workforce
          <span className="text-sm font-normal text-muted-foreground">
            ({employees.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {locationEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one clocked in yet today</p>
        ) : (
          <div className="space-y-4">
            {locationEntries.map(([loc, emps]) => (
              <div key={loc}>
                <p className="text-sm font-semibold text-foreground mb-1.5">
                  {loc} ({emps.length})
                </p>
                <div className="space-y-1.5 pl-3 border-l-2 border-muted">
                  {emps.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {emp.staffName}
                        {emp.role && (
                          <span className="text-muted-foreground ml-1">· {emp.role}</span>
                        )}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(emp.checkInAt), 'HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
