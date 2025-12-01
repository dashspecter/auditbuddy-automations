import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

const Shifts = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shift Scheduling</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage shifts for your team
          </p>
        </div>
        <Button className="gap-2">
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
            <div className="text-center text-muted-foreground py-12">
              <p>No shifts scheduled for this date.</p>
              <Button className="mt-4" variant="outline">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create Shift
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Shifts;