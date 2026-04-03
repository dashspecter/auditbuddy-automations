import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCmmsWorkOrders } from "@/hooks/useCmmsWorkOrders";
import { useMyGovSiteCheckins, useGovSiteCheckout } from "@/hooks/useGovSiteCheckins";
import { SiteMap } from "@/components/gov/SiteMap";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Clock, Plus, HardHat, CheckCircle2, AlertTriangle,
  ChevronRight, LogOut, Wrench,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";

const WO_STATUS_COLORS: Record<string, string> = {
  Open: "bg-slate-100 text-slate-700",
  OnHold: "bg-amber-100 text-amber-700",
  InProgress: "bg-blue-100 text-blue-700",
  Done: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-slate-100 text-slate-500",
  Medium: "bg-blue-100 text-blue-600",
  High: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700",
};

export default function StaffGovHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);

  // Load employee record
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("employees")
      .select("id, full_name, user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setEmployee(data); });
  }, [user?.id]);

  const { data: workOrders = [] } = useCmmsWorkOrders(
    user?.id ? { assigned_user_id: user.id, status: ["Open", "InProgress", "OnHold"] } : undefined
  );

  const { data: checkins = [] } = useMyGovSiteCheckins(employee?.id);
  const checkout = useGovSiteCheckout();

  // Find the most recent open checkin (no check_out_at)
  const openCheckin = checkins.find(c => !c.check_out_at) ?? null;

  const govWorkOrders = workOrders.filter(wo => wo.project_id);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-4 pt-10 pb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-white/20 rounded-xl">
            <HardHat className="h-5 w-5" />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Field Operations</p>
            <h1 className="text-xl font-bold">{employee?.full_name ?? "Loading…"}</h1>
          </div>
        </div>
        <p className="text-blue-200 text-sm mt-3">{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Active Check-in Banner */}
        {openCheckin ? (
          <Card className="border-blue-300 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Active Site</p>
                    <p className="font-semibold text-sm mt-0.5">{openCheckin.location?.name}</p>
                    {openCheckin.project && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {openCheckin.project.project_number ? `${openCheckin.project.project_number} · ` : ""}
                        {openCheckin.project.title}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                      <Clock className="h-3 w-3" />
                      Checked in {formatDistanceToNow(new Date(openCheckin.check_in_at), { addSuffix: true })}
                    </div>
                    {openCheckin.geofence_validated === false && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" /> Outside geofence at check-in
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
                  disabled={checkout.isPending}
                  onClick={() => checkout.mutate({
                    checkinId: openCheckin.id,
                    employeeId: employee.id,
                    projectId: openCheckin.project_id ?? undefined,
                  })}
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  {checkout.isPending ? "…" : "Check Out"}
                </Button>
              </div>
            </CardContent>
            {/* Site map — show when location has coordinates */}
            {openCheckin.location?.geofence_lat != null && openCheckin.location.geofence_lon != null && (
              <div className="px-4 pb-4">
                <SiteMap
                  lat={openCheckin.location.geofence_lat}
                  lon={openCheckin.location.geofence_lon}
                  locationName={openCheckin.location.name}
                  geofenceLat={openCheckin.location.geofence_lat}
                  geofenceLon={openCheckin.location.geofence_lon}
                  geofenceRadiusM={openCheckin.location.geofence_radius_meters}
                  workerLat={openCheckin.checkin_lat}
                  workerLon={openCheckin.checkin_lon}
                />
              </div>
            )}
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-muted-foreground/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Not checked in</p>
                  <p className="text-xs text-muted-foreground">Check in when you arrive on site</p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate("/staff/gov/checkin")}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Check In
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Assigned Work Orders */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-semibold text-foreground">
              My Work Orders
              {govWorkOrders.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({govWorkOrders.length} linked to projects)</span>
              )}
            </h2>
          </div>

          {workOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-8">
                <Wrench className="h-7 w-7 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No open work orders assigned to you.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {workOrders.map(wo => {
                const isOverdue = wo.due_at && isPast(new Date(wo.due_at)) && wo.status !== "Done";
                return (
                  <Card
                    key={wo.id}
                    className={`cursor-pointer active:scale-[0.99] transition-transform ${isOverdue ? "border-red-200" : ""}`}
                    onClick={() => navigate(`/staff/gov/work-orders/${wo.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">WO-{wo.wo_number}</span>
                          <span className="font-medium text-sm truncate">{wo.title}</span>
                        </div>
                        {wo.project_id && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-blue-600">
                            <HardHat className="h-3 w-3" />
                            <span>Government project</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          {wo.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{wo.location.name}</span>}
                          {wo.due_at && (
                            <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                              {isOverdue ? "Overdue · " : "Due "}
                              {format(new Date(wo.due_at), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={`text-[10px] ${WO_STATUS_COLORS[wo.status]}`} variant="secondary">
                          {wo.status}
                        </Badge>
                        <Badge className={`text-[10px] ${PRIORITY_COLORS[wo.priority]}`} variant="secondary">
                          {wo.priority}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent site check-ins */}
        {checkins.filter(c => c.check_out_at).length > 0 && (
          <div>
            <h2 className="text-sm font-semibold px-1 mb-2">Recent Check-ins</h2>
            <div className="space-y-2">
              {checkins.filter(c => c.check_out_at).slice(0, 3).map(c => (
                <Card key={c.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-medium truncate">{c.location?.name}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(c.check_in_at), "MMM d, HH:mm")}
                        {c.check_out_at && ` – ${format(new Date(c.check_out_at), "HH:mm")}`}
                      </p>
                    </div>
                    {c.geofence_validated === false && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <StaffBottomNav />
    </div>
  );
}
