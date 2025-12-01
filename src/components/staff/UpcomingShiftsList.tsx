import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Calendar } from "lucide-react";

interface UpcomingShiftsListProps {
  shifts: any[];
}

export const UpcomingShiftsList = ({ shifts }: UpcomingShiftsListProps) => {
  if (shifts.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No upcoming shifts</p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your upcoming shifts</h2>
        <span className="text-sm text-primary">View all</span>
      </div>
      
      <div className="space-y-3">
        {shifts.map((assignment) => {
          const shiftDate = new Date(assignment.shifts.shift_date);
          const isToday = shiftDate.toDateString() === new Date().toDateString();
          
          return (
            <Card key={assignment.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center justify-center min-w-[50px] bg-muted rounded-lg p-2">
                    <div className="text-2xl font-bold leading-none">
                      {shiftDate.getDate()}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase mt-1">
                      {shiftDate.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">
                        {assignment.shifts.start_time.slice(0, 5)} – {assignment.shifts.end_time.slice(0, 5)}
                      </span>
                      {isToday && (
                        <Badge variant="default" className="text-xs">Today</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="truncate">{assignment.shifts.role}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{assignment.shifts.locations?.name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
