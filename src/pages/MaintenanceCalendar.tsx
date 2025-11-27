import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as BigCalendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationSelector } from "@/components/LocationSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEquipmentInterventions } from "@/hooks/useEquipmentInterventions";
import { useEquipment } from "@/hooks/useEquipment";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/components/ui/calendar.css";

const localizer = momentLocalizer(moment);

export default function MaintenanceCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [locationId, setLocationId] = useState<string>("__all__");
  const [equipmentId, setEquipmentId] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());

  const { data: equipment } = useEquipment(locationId, "active");
  const { data: interventions } = useEquipmentInterventions(
    equipmentId === "__all__" ? undefined : equipmentId,
    locationId,
    undefined,
    statusFilter === "__all__" ? undefined : statusFilter
  );

  const events = useMemo(() => {
    if (!interventions) return [];

    return interventions.map((intervention) => ({
      id: intervention.id,
      title: `${intervention.equipment?.name} - ${intervention.title}`,
      start: new Date(intervention.scheduled_for),
      end: new Date(intervention.scheduled_for),
      resource: intervention,
    }));
  }, [interventions]);

  const eventStyleGetter = (event: any) => {
    const status = event.resource.status;
    let backgroundColor = "#6366f1"; // scheduled - primary

    if (status === "completed") {
      backgroundColor = "#22c55e"; // green
    } else if (status === "overdue") {
      backgroundColor = "#ef4444"; // red
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const handleSelectEvent = (event: any) => {
    navigate(`/interventions/${event.id}`);
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Calendar</h1>
          <p className="text-muted-foreground">Schedule and track equipment maintenance interventions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <LocationSelector
                  value={locationId}
                  onValueChange={(value) => {
                    setLocationId(value);
                    setEquipmentId("__all__"); // Reset equipment when location changes
                  }}
                  allowAll
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Equipment</label>
                <Select value={equipmentId} onValueChange={setEquipmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Equipment</SelectItem>
                    {equipment?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Legend</label>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-primary">Scheduled</Badge>
                  <Badge className="bg-green-500">Completed</Badge>
                  <Badge className="bg-destructive">Overdue</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate(moment(date).subtract(1, view === "month" ? "month" : "week").toDate())}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate(moment(date).add(1, view === "month" ? "month" : "week").toDate())}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={view === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("month")}
                >
                  Month
                </Button>
                <Button
                  variant={view === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("week")}
                >
                  Week
                </Button>
                <Button
                  variant={view === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("day")}
                >
                  Day
                </Button>
              </div>
            </div>

            <div className="h-[600px]">
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={setView}
                date={date}
                onNavigate={handleNavigate}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                popup
                style={{ height: "100%" }}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
