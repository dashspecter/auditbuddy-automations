import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useEquipment } from "@/hooks/useEquipment";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle } from "lucide-react";

export const EquipmentCalendarView = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { data: equipment } = useEquipment();

  // Get equipment with checks on the selected date
  const checksOnDate = equipment?.filter((item) => {
    if (!selectedDate || !item.next_check_date) return false;
    const checkDate = new Date(item.next_check_date);
    return (
      checkDate.getDate() === selectedDate.getDate() &&
      checkDate.getMonth() === selectedDate.getMonth() &&
      checkDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Identify dates with scheduled checks for highlighting
  const datesWithChecks = equipment?.reduce((acc, item) => {
    if (item.next_check_date) {
      const date = new Date(item.next_check_date);
      acc.add(date.toDateString());
    }
    return acc;
  }, new Set<string>());

  const modifiers = {
    hasCheck: (date: Date) => datesWithChecks?.has(date.toDateString()) || false,
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Checks Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={modifiers}
            modifiersClassNames={{
              hasCheck: "bg-primary/20 font-bold",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checksOnDate && checksOnDate.length > 0 ? (
            <div className="space-y-3">
              {checksOnDate.map((item) => {
                const isOverdue = new Date(item.next_check_date!) < new Date();
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.locations?.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOverdue ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Scheduled
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No checks scheduled for this date.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
