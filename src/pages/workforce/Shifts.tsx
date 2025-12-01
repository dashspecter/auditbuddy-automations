import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Clock, MapPin, Users, Calendar as CalendarIcon, Columns3 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { ShiftDialog } from "@/components/workforce/ShiftDialog";
import { useShifts } from "@/hooks/useShifts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedShiftWeekView } from "@/components/workforce/EnhancedShiftWeekView";

const Shifts = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [view, setView] = useState<"day" | "week">("week");
  
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
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
            <TabsList>
              <TabsTrigger value="day" className="gap-1">
                <CalendarIcon className="h-4 w-4" />
                Day
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1">
                <Columns3 className="h-4 w-4" />
                Week
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button className="gap-2" onClick={() => setShiftDialogOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            Create Shift
          </Button>
        </div>
      </div>

      {view === "week" ? (
        <EnhancedShiftWeekView />
      ) : (
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
                  <div key={shift.id} className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="font-semibold text-base">{shift.role}</div>
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          {shift.required_count} needed
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{shift.locations?.name || 'Location'}</span>
                      </div>
                    </div>
                    {shift.notes && (
                      <div className="mt-2 text-sm text-muted-foreground border-t pt-2">
                        {shift.notes}
                      </div>
                    )}
                    {shift.creator_name && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Created by: {shift.creator_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}
      
      <ShiftDialog
        open={shiftDialogOpen} 
        onOpenChange={setShiftDialogOpen}
        defaultDate={date}
      />
    </div>
  );
};

export default Shifts;