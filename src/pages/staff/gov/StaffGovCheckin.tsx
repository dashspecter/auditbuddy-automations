import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGovProjects } from "@/hooks/useGovProjects";
import { useLocations } from "@/hooks/useLocations";
import { useCmmsWorkOrders } from "@/hooks/useCmmsWorkOrders";
import { useGovSiteCheckin } from "@/hooks/useGovSiteCheckins";
import { GeofenceResult } from "@/hooks/useGovSiteCheckins";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, MapPin, Loader2, CheckCircle2, AlertTriangle, HardHat,
} from "lucide-react";
import { toast } from "sonner";

type Step = "select" | "locating" | "geofence_warn" | "success";

export default function StaffGovCheckin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const checkinMutation = useGovSiteCheckin();

  const [employee, setEmployee] = useState<any>(null);
  const [step, setStep] = useState<Step>("select");

  // Form state
  const [projectId, setProjectId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [notes, setNotes] = useState("");
  const [geofenceResult, setGeofenceResult] = useState<GeofenceResult | null>(null);

  // Load employee
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("employees")
      .select("id, full_name, user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setEmployee(data); });
  }, [user?.id]);

  const { data: activeProjects = [] } = useGovProjects({ status: ["active"] });
  const { data: allLocations = [] } = useLocations();
  const { data: myWorkOrders = [] } = useCmmsWorkOrders(
    user?.id ? { assigned_user_id: user.id, status: ["Open", "InProgress"] } : undefined
  );

  // Filter WOs by project if selected
  const filteredWOs = projectId
    ? myWorkOrders.filter(wo => wo.project_id === projectId)
    : myWorkOrders;

  // When project changes, auto-set location if the project has one
  useEffect(() => {
    if (projectId) {
      const project = activeProjects.find(p => p.id === projectId);
      if (project?.location_id) setLocationId(project.location_id);
    }
  }, [projectId, activeProjects]);

  const selectedLocation = allLocations.find(l => l.id === locationId);

  const handleCheckin = async (force = false) => {
    if (!locationId || !employee?.id) {
      toast.error("Select a location first");
      return;
    }

    setStep("locating");

    const result = await checkinMutation.mutateAsync({
      employee_id: employee.id,
      location_id: locationId,
      project_id: projectId || undefined,
      work_order_id: workOrderId || undefined,
      notes: notes.trim() || undefined,
      locationMeta: selectedLocation
        ? {
            geofence_radius_meters: (selectedLocation as any).geofence_radius_meters ?? null,
            geofence_lat: (selectedLocation as any).geofence_lat ?? null,
            geofence_lon: (selectedLocation as any).geofence_lon ?? null,
          }
        : undefined,
      forceCheckIn: force,
    });

    if (!result.success) {
      setGeofenceResult(result.geofenceResult);
      setStep("geofence_warn");
      return;
    }

    setStep("success");
  };

  if (step === "locating") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-sm text-muted-foreground">Getting your location…</p>
      </div>
    );
  }

  if (step === "geofence_warn" && geofenceResult) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="px-4 pt-6 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => { setStep("select"); setGeofenceResult(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>

          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h2 className="font-semibold text-amber-800">Outside Geofence</h2>
              </div>
              <p className="text-sm text-amber-800">
                You are <strong>{geofenceResult.distanceM}m</strong> away from{" "}
                <strong>{selectedLocation?.name}</strong>.
                The allowed radius is <strong>{geofenceResult.radiusM}m</strong>.
              </p>
              <p className="text-xs text-amber-700">
                This may be due to GPS drift or your actual position. Your check-in will be recorded
                as outside the geofence for audit purposes.
              </p>
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 border-amber-300"
                  onClick={() => { setStep("select"); setGeofenceResult(null); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => handleCheckin(true)}
                  disabled={checkinMutation.isPending}
                >
                  {checkinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check In Anyway"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <StaffBottomNav />
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 pb-24">
        <div className="p-4 bg-green-100 rounded-full">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-center">Checked In!</h2>
        <p className="text-center text-muted-foreground text-sm">
          {selectedLocation?.name}
          {projectId && activeProjects.find(p => p.id === projectId) && (
            <span className="block mt-1 text-xs">
              {activeProjects.find(p => p.id === projectId)?.title}
            </span>
          )}
        </p>
        <Button className="mt-4" onClick={() => navigate("/staff/gov")}>
          Back to Field Ops
        </Button>
        <StaffBottomNav />
      </div>
    );
  }

  // Step: select
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-4 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 shrink-0" onClick={() => navigate("/staff/gov")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-blue-200 text-xs uppercase tracking-wider">Site Check-in</p>
            <h1 className="text-xl font-bold">Check In to Site</h1>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Project (optional) */}
        {activeProjects.length > 0 && (
          <div className="space-y-1.5">
            <Label>Project <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Select value={projectId} onValueChange={v => { setProjectId(v === "none" ? "" : v); setWorkOrderId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select project…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific project</SelectItem>
                {activeProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <HardHat className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>{p.project_number ? `${p.project_number} · ` : ""}{p.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Location (required) */}
        <div className="space-y-1.5">
          <Label>
            Location <span className="text-red-500">*</span>
          </Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select site location…" />
            </SelectTrigger>
            <SelectContent>
              {allLocations.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{l.name}</span>
                    {(l as any).geofence_radius_meters && (
                      <span className="text-xs text-blue-500">· Geofenced</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedLocation && (selectedLocation as any).geofence_radius_meters && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Geofence: {(selectedLocation as any).geofence_radius_meters}m radius — your GPS will be verified
            </p>
          )}
        </div>

        {/* Work Order (optional) */}
        {filteredWOs.length > 0 && (
          <div className="space-y-1.5">
            <Label>Work Order <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Select value={workOrderId} onValueChange={v => setWorkOrderId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select work order…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific work order</SelectItem>
                {filteredWOs.map(wo => (
                  <SelectItem key={wo.id} value={wo.id}>
                    WO-{wo.wo_number} · {wo.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            placeholder="Any notes about this check-in…"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <Button
          className="w-full h-12 text-base"
          disabled={!locationId || checkinMutation.isPending}
          onClick={() => handleCheckin(false)}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Check In
        </Button>
      </div>

      <StaffBottomNav />
    </div>
  );
}
