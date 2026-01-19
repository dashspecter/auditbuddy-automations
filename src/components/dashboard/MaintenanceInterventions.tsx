import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Wrench } from "lucide-react";
import { useEquipmentInterventions } from "@/hooks/useEquipmentInterventions";
import { Link } from "react-router-dom";
import { format, isPast, isFuture, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export const MaintenanceInterventions = () => {
  const { data: interventions, isLoading } = useEquipmentInterventions();

  const upcomingInterventions = interventions?.filter(
    (i) => i.status === "scheduled" && isFuture(new Date(i.scheduled_for))
  ).slice(0, 3);

  const overdueInterventions = interventions?.filter(
    (i) => i.status === "overdue"
  ).slice(0, 3);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasOverdue = (overdueInterventions?.length || 0) > 0;
  const hasUpcoming = (upcomingInterventions?.length || 0) > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Schedule
          </CardTitle>
          <Link to="/maintenance-calendar">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasOverdue && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">Overdue ({overdueInterventions?.length})</span>
            </div>
            {overdueInterventions?.map((intervention) => (
              <Link
                key={intervention.id}
                to={`/interventions/${intervention.id}`}
                className="block"
              >
                <div className="p-3 border border-destructive/30 bg-destructive/5 rounded-lg hover:bg-destructive/10 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{intervention.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {intervention.equipment?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {intervention.locations?.name}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <Badge variant="destructive" className="text-xs">
                        {Math.abs(differenceInDays(new Date(intervention.scheduled_for), new Date()))}d overdue
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {hasUpcoming && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-semibold">Upcoming</span>
            </div>
            {upcomingInterventions?.map((intervention) => {
              const daysUntil = differenceInDays(new Date(intervention.scheduled_for), new Date());
              const isUrgent = daysUntil <= 3;
              
              return (
                <Link
                  key={intervention.id}
                  to={`/interventions/${intervention.id}`}
                  className="block"
                >
                  <div className={`p-3 border rounded-lg hover:bg-accent transition-colors ${
                    isUrgent ? 'border-warning/30 bg-warning/5' : 'border-border'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{intervention.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {intervention.equipment?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {intervention.locations?.name}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <Badge variant={isUrgent ? "outline" : "secondary"} className="text-xs">
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(intervention.scheduled_for), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!hasOverdue && !hasUpcoming && (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No scheduled maintenance</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
