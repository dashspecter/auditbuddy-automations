import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as BigCalendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationSelector } from "@/components/LocationSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEquipmentInterventions } from "@/hooks/useEquipmentInterventions";
import { useEquipment } from "@/hooks/useEquipment";
import { useRecurringMaintenanceSchedules } from "@/hooks/useRecurringMaintenanceSchedules";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/components/ui/calendar.css";

const localizer = momentLocalizer(moment);

// Generate recurring schedule occurrences for a given date range
const generateRecurringOccurrences = (
  schedule: any,
  rangeStart: Date,
  rangeEnd: Date
) => {
  const occurrences: any[] = [];
  const startDate = moment(schedule.start_date);
  const endDate = schedule.end_date ? moment(schedule.end_date) : moment(rangeEnd);
  const rangeStartMoment = moment(rangeStart);
  const rangeEndMoment = moment(rangeEnd);

  let currentDate = startDate.clone();

  // Move currentDate to the start of the range if it's before
  while (currentDate.isBefore(rangeStartMoment) && currentDate.isBefore(endDate)) {
    switch (schedule.recurrence_pattern) {
      case "daily":
        currentDate.add(1, "day");
        break;
      case "weekly":
        currentDate.add(1, "week");
        break;
      case "monthly":
        currentDate.add(1, "month");
        break;
      case "quarterly":
        currentDate.add(3, "months");
        break;
      case "yearly":
        currentDate.add(1, "year");
        break;
      default:
        currentDate.add(1, "day");
    }
  }

  // Generate occurrences within the range
  while (currentDate.isSameOrBefore(rangeEndMoment) && currentDate.isSameOrBefore(endDate)) {
    // Apply time from start_time
    const [hours, minutes] = (schedule.start_time || "09:00:00").split(":");
    const occurrenceDate = currentDate.clone().hours(parseInt(hours)).minutes(parseInt(minutes));

    occurrences.push({
      id: `recurring-${schedule.id}-${occurrenceDate.format("YYYY-MM-DD")}`,
      title: `${schedule.equipment?.name || "Equipment"} - ${schedule.title}`,
      start: occurrenceDate.toDate(),
      end: occurrenceDate.toDate(),
      resource: {
        ...schedule,
        status: "scheduled",
        isRecurring: true,
      },
    });

    // Move to next occurrence
    switch (schedule.recurrence_pattern) {
      case "daily":
        currentDate.add(1, "day");
        break;
      case "weekly":
        currentDate.add(1, "week");
        break;
      case "monthly":
        currentDate.add(1, "month");
        break;
      case "quarterly":
        currentDate.add(3, "months");
        break;
      case "yearly":
        currentDate.add(1, "year");
        break;
      default:
        currentDate.add(1, "day");
    }
  }

  return occurrences;
};

export default function MaintenanceCalendar() {
  const { t } = useTranslation();
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
  const { data: recurringSchedules } = useRecurringMaintenanceSchedules(
    equipmentId === "__all__" ? undefined : equipmentId
  );

  const events = useMemo(() => {
    const interventionEvents = (interventions || []).map((intervention) => ({
      id: intervention.id,
      title: `${intervention.equipment?.name} - ${intervention.title}`,
      start: new Date(intervention.scheduled_for),
      end: new Date(intervention.scheduled_for),
      resource: intervention,
    }));

    // Generate recurring maintenance occurrences for visible range (3 months around current date)
    const rangeStart = moment(date).subtract(1, "month").startOf("month").toDate();
    const rangeEnd = moment(date).add(2, "months").endOf("month").toDate();

    const recurringEvents = (recurringSchedules || [])
      .filter((schedule) => {
        // Filter by location if selected
        if (locationId !== "__all__" && schedule.location_id !== locationId) {
          return false;
        }
        // Only active schedules
        return schedule.is_active;
      })
      .flatMap((schedule) => generateRecurringOccurrences(schedule, rangeStart, rangeEnd));

    // Apply status filter to recurring events if needed
    if (statusFilter !== "__all__" && statusFilter !== "scheduled") {
      return interventionEvents;
    }

    return [...interventionEvents, ...recurringEvents];
  }, [interventions, recurringSchedules, date, locationId, statusFilter]);

  const eventStyleGetter = (event: any) => {
    const status = event.resource.status;
    let backgroundColor = "#f97316"; // scheduled - orange (matches theme primary)

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
    if (event.resource?.isRecurring) {
      // Navigate to recurring maintenance schedules page for recurring events
      navigate("/recurring-maintenance-schedules");
    } else {
      navigate(`/interventions/${event.id}`);
    }
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('equipment.maintenanceCalendar.title')}</h1>
          <p className="text-muted-foreground">{t('equipment.maintenanceCalendar.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('common.filters')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.location')}</label>
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
                <label className="text-sm font-medium">{t('nav.equipment')}</label>
                <Select value={equipmentId} onValueChange={setEquipmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('equipment.allEquipment')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('equipment.allEquipment')}</SelectItem>
                    {equipment?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.status')}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('equipment.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('equipment.allStatuses')}</SelectItem>
                    <SelectItem value="scheduled">{t('equipment.statusScheduled')}</SelectItem>
                    <SelectItem value="completed">{t('equipment.statusCompleted')}</SelectItem>
                    <SelectItem value="overdue">{t('equipment.statusOverdue')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('equipment.legend')}</label>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-primary">{t('equipment.statusScheduled')}</Badge>
                  <Badge className="bg-green-500">{t('equipment.statusCompleted')}</Badge>
                  <Badge className="bg-destructive">{t('equipment.statusOverdue')}</Badge>
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
                  {t('common.today')}
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
                  {t('common.month')}
                </Button>
                <Button
                  variant={view === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("week")}
                >
                  {t('common.week')}
                </Button>
                <Button
                  variant={view === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("day")}
                >
                  {t('common.day')}
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
    </div>
  );
}
