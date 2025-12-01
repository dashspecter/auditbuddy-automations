import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Clock, MapPin, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { ShiftDialog } from "@/components/workforce/ShiftDialog";
import { useShifts } from "@/hooks/useShifts";
import { Badge } from "@/components/ui/badge";

const Shifts = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  
  const dateStr = date ? date.toISOString().split('T')[0] : "";
  const { data: shifts = [], isLoading } = useShifts(undefined, dateStr, dateStr);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shift Scheduling</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage shifts for your team
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShiftDialogOpen(true)}>
          <CalendarPlus className="h-4 w-4" />
          Create Shift
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>Select a date to view or create shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shifts for {date?.toLocaleDateString()}</CardTitle>
            <CardDescription>View and manage today's shifts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading shifts...</p>
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p>No shifts scheduled for this date.</p>
                <Button className="mt-4" variant="outline" onClick={() => setShiftDialogOpen(true)}>
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Create Shift
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {shifts.map((shift) => (
                  <Card key={shift.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{shift.role}</Badge>
                          <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1" />
                            {shift.required_count} needed
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {shift.locations?.name || 'Location'}
                          </div>
                        </div>
                        {shift.notes && (
                          <p className="text-sm text-muted-foreground">{shift.notes}</p>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <ShiftDialog 
        open={shiftDialogOpen} 
        onOpenChange={setShiftDialogOpen}
        defaultDate={date}
      />
    </div>
  );
};

export default Shifts;