import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock, UserCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';
import type { ClockedInEmployee, ScheduledEmployee } from '@/hooks/useMobileCommandData';

interface Props {
  data: ClockedInEmployee[] | undefined;
  scheduled: ScheduledEmployee[] | undefined;
  isLoading: boolean;
}

interface MergedEmployee {
  staffId: string;
  staffName: string;
  role: string;
  status: 'here' | 'expected';
  time: string; // clock-in time or shift start
}

export const LiveWorkforceSection = ({ data, scheduled, isLoading }: Props) => {
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
  const scheduledList = scheduled ?? [];

  // Build clocked-in lookup by staffId (from attendance_logs staff_id)
  const clockedInByStaff = new Map<string, ClockedInEmployee>();
  for (const e of clockedIn) {
    // attendance_logs uses staff_id which maps to employees.id
    // We need to match by name since clocked-in doesn't expose staff_id directly
    // Actually it does via the row id pattern - let's use staffName as key
  }

  // Group by location — merge scheduled + clocked-in
  const locationMap = new Map<string, { locationName: string; employees: MergedEmployee[] }>();

  // First add all clocked-in employees
  const clockedInNames = new Set<string>();
  for (const emp of clockedIn) {
    clockedInNames.add(emp.staffName);
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

  // Then add scheduled employees who are NOT clocked in
  for (const emp of scheduledList) {
    if (clockedInNames.has(emp.staffName)) continue;
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
  const totalExpected = locationEntries.reduce((sum, [, loc]) => sum + loc.employees.length, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <Users className="h-4 w-4" />
          Live Workforce
          <span className="text-sm font-normal text-muted-foreground">
            ({totalHere}/{totalExpected} arrived)
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
              const total = loc.employees.length;
              return (
                <div key={locName}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-foreground">{locName}</p>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {here}/{total}
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-muted">
                    {loc.employees.map(emp => (
                      <div key={`${emp.staffName}-${emp.status}`} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-foreground">
                          {emp.status === 'here' ? (
                            <UserCheck className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <UserX className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className={emp.status === 'expected' ? 'text-muted-foreground' : ''}>
                            {emp.staffName}
                          </span>
                          {emp.role && (
                            <span className="text-muted-foreground">· {emp.role}</span>
                          )}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {emp.status === 'here' ? emp.time : `exp ${emp.time}`}
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
