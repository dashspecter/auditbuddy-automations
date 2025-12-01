import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { useShifts } from "@/hooks/useShifts";
import { useShiftAssignments } from "@/hooks/useShiftAssignments";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { ShiftDialog } from "./ShiftDialog";

export const ShiftWeekView = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  
  const { data: shifts = [], isLoading } = useShifts(
    undefined,
    format(currentWeekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(shift => shift.shift_date === dateStr);
  };

  const handleAddShift = (date: Date) => {
    setSelectedDate(date);
    setShiftDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold min-w-[200px] text-center">
            {format(currentWeekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-3 overflow-x-auto">
        {weekDays.map((day) => {
          const dayShifts = getShiftsForDay(day);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          
          return (
            <div
              key={day.toISOString()}
              className={`min-w-[180px] ${isWeekend ? 'bg-muted/30' : ''} rounded-lg`}
            >
              {/* Day header */}
              <div className={`p-3 border-b ${isToday ? 'bg-primary text-primary-foreground' : 'bg-card'} rounded-t-lg`}>
                <div className="text-xs font-medium">{format(day, 'EEE dd')}</div>
                <div className="text-sm">{format(day, 'HH:mm')} - {format(addDays(day, 1), 'HH:mm').slice(0, 5)}</div>
              </div>
              
              {/* Shifts for the day */}
              <div className="p-2 space-y-2 min-h-[400px] bg-card/50 rounded-b-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs justify-start text-primary"
                  onClick={() => handleAddShift(day)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add shift
                </Button>
                
                {dayShifts.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    No shifts
                  </div>
                ) : (
                  dayShifts.map((shift) => (
                    <ShiftCard key={shift.id} shift={shift} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ShiftDialog 
        open={shiftDialogOpen} 
        onOpenChange={setShiftDialogOpen}
        defaultDate={selectedDate}
      />
    </div>
  );
};

const ShiftCard = ({ shift }: { shift: any }) => {
  const { data: assignments = [] } = useShiftAssignments(shift.id);
  
  return (
    <Card className="p-2 border-l-4 border-l-primary hover:shadow-md transition-shadow cursor-pointer">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            <Users className="h-2.5 w-2.5 mr-1" />
            {assignments.length}/{shift.required_count}
          </Badge>
        </div>
        
        <div className="font-medium text-sm">{shift.role}</div>
        <div className="text-xs text-muted-foreground">
          {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
        </div>
        
        {shift.creator_name && (
          <div className="text-xs text-muted-foreground pt-1 border-t">
            {shift.creator_name}
          </div>
        )}
        
        {assignments.length > 0 && (
          <div className="pt-1 border-t space-y-1">
            {assignments.map((assignment: any) => (
              <div key={assignment.id} className="text-xs bg-muted/50 rounded px-1.5 py-0.5">
                {assignment.employees?.full_name}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
