import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock, UserCheck, UserX, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import type { ClockedInEmployee, ClockedOutEmployee, ScheduledEmployee } from '@/hooks/useMobileCommandData';

interface Props {
  data: ClockedInEmployee[] | undefined;
  clockedOut: ClockedOutEmployee[] | undefined;
  scheduled: ScheduledEmployee[] | undefined;
  isLoading: boolean;
}

interface MergedEmployee {
  staffId: string;
  staffName: string;
  role: string;
  status: 'here' | 'left' | 'expected';
  time: string; // clock-in time, clock-out time, or shift start
}

export const LiveWorkforceSection = ({ data, clockedOut, scheduled, isLoading }: Props) => {
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

  const clockedIn = data ?? [];
  const clockedOutList = clockedOut ?? [];
  const scheduledList = scheduled ?? [];

  // Build sets for matching
  const clockedInNames = new Set(clockedIn.map(e => e.staffName));
  const clockedOutNames = new Set(clockedOutList.map(e => e.staffName));

  // Group by location
  const locationMap = new Map<string, { locationName: string; employees: MergedEmployee[] }>();

  // 1. Add all currently clocked-in employees
  for (const emp of clockedIn) {
    const loc = locationMap.get(emp.locationName) ?? { locationName: emp.locationName, employees: [] };
    loc.employees.push({
      staffId: emp.id,
      staffName: emp.staffName,
      role: emp.role,
      status: 'here',
      time: format(new Date(emp.checkInAt), 'HH:mm'),
    });
    locationMap.set(emp.locationName, loc);
  }

  // 2. Add clocked-out employees (worked and left) — only if they appear in scheduled list
  for (const emp of clockedOutList) {
    if (clockedInNames.has(emp.staffName)) continue; // still clocked in somewhere else
    const loc = locationMap.get(emp.locationName) ?? { locationName: emp.locationName, employees: [] };
    loc.employees.push({
      staffId: emp.id,
      staffName: emp.staffName,
      role: emp.role,
      status: 'left',
      time: format(new Date(emp.checkOutAt), 'HH:mm'),
    });
    locationMap.set(emp.locationName, loc);
  }

  // 3. Add scheduled employees who are NOT clocked in AND NOT clocked out
  for (const emp of scheduledList) {
    if (clockedInNames.has(emp.staffName)) continue;
    if (clockedOutNames.has(emp.staffName)) continue;
    const loc = locationMap.get(emp.locationName) ?? { locationName: emp.locationName, employees: [] };
    loc.employees.push({
      staffId: emp.staffId,
      staffName: emp.staffName,
      role: emp.role,
      status: 'expected',
      time: emp.shiftStart,
    });
    locationMap.set(emp.locationName, loc);
  }

  const locationEntries = [...locationMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const totalHere = clockedIn.length;
  const totalWorked = totalHere + clockedOutList.filter(e => !clockedInNames.has(e.staffName)).length;
  const totalExpected = locationEntries.reduce((sum, [, loc]) => sum + loc.employees.length, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <Users className="h-4 w-4" />
          Live Workforce
          <span className="text-sm font-normal text-muted-foreground">
            ({totalHere} in · {totalWorked}/{totalExpected} worked)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {locationEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one scheduled or clocked in yet today</p>
        ) : (
          <div className="space-y-4">
            {locationEntries.map(([locName, loc]) => {
              const here = loc.employees.filter(e => e.status === 'here').length;
              const left = loc.employees.filter(e => e.status === 'left').length;
              const total = loc.employees.length;
              return (
                <div key={locName}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-foreground">{locName}</p>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {here} in{left > 0 ? ` · ${left} left` : ''} / {total}
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-muted">
                    {loc.employees.map(emp => (
                      <div key={`${emp.staffName}-${emp.status}`} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-foreground">
                          {emp.status === 'here' ? (
                            <UserCheck className="h-3 w-3 text-green-500 shrink-0" />
                          ) : emp.status === 'left' ? (
                            <LogOut className="h-3 w-3 text-blue-400 shrink-0" />
                          ) : (
                            <UserX className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className={emp.status === 'expected' ? 'text-muted-foreground' : emp.status === 'left' ? 'text-muted-foreground line-through' : ''}>
                            {emp.staffName}
                          </span>
                          {emp.role && (
                            <span className="text-muted-foreground">· {emp.role}</span>
                          )}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {emp.status === 'here' ? emp.time : emp.status === 'left' ? `left ${emp.time}` : `exp ${emp.time}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
