import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { QrCode, Clock, AlertTriangle, CheckCircle2, ArrowLeft, ScanLine } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

export default function StaffCheckpoints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [scannerRef, setScannerRef] = useState<Html5Qrcode | null>(null);

  // Get employee data
  const { data: employee } = useQuery({
    queryKey: ["staff-employee", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, company_id, location_id, full_name, locations(name)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get all location assignments with checkpoints for this employee's locations
  const { data: assignments } = useQuery({
    queryKey: ["staff-all-checkpoints", employee?.company_id, employee?.location_id],
    queryFn: async () => {
      if (!employee) return [];
      
      // Get employee's locations (primary + additional)
      const { data: additionalLocs } = await supabase
        .from("staff_locations")
        .select("location_id")
        .eq("staff_id", employee.id);
      
      const locationIds = [employee.location_id, ...(additionalLocs?.map(l => l.location_id) || [])].filter(Boolean);
      
      const { data, error } = await supabase
        .from("location_form_templates")
        .select(`
          *,
          form_templates(name, category, type),
          locations!location_form_templates_location_id_fkey(name)
        `)
        .eq("company_id", employee.company_id)
        .in("location_id", locationIds)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!employee,
  });

  // Get today's submissions
  const { data: todaySubmissions } = useQuery({
    queryKey: ["staff-checkpoint-submissions-all", employee?.company_id],
    queryFn: async () => {
      if (!employee) return [];
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("form_submissions")
        .select("id, location_form_template_id, status, data, created_at")
        .eq("company_id", employee.company_id)
        .eq("submitted_by", user!.id)
        .gte("created_at", today + "T00:00:00")
        .lte("created_at", today + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
    enabled: !!employee,
  });

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef) {
        try { scannerRef.stop(); } catch {}
      }
    };
  }, [scannerRef]);

  const startScan = async () => {
    setScanning(true);
    try {
      // First check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available. Please use HTTPS or a supported browser.");
      }
      
      // Request camera permission explicitly first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop());
      } catch (permErr: any) {
        if (permErr.name === "NotAllowedError") {
          throw new Error("Camera permission denied. Please allow camera access in your browser/device settings.");
        } else if (permErr.name === "NotFoundError") {
          throw new Error("No camera found on this device.");
        }
        throw new Error("Camera error: " + (permErr.message || permErr.name || "Unknown error"));
      }

      // Wait for DOM element
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const scanner = new Html5Qrcode("qr-reader");
      setScannerRef(scanner);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const match = decodedText.match(/\/qr\/forms\/([a-f0-9-]+)/);
          if (match) {
            scanner.stop().then(() => {
              setScanning(false);
              navigate(`/qr/forms/${match[1]}`);
            });
          } else {
            toast.error("Invalid QR code. Please scan a checkpoint QR code.");
          }
        },
        () => {} // ignore scan errors
      );
    } catch (err: any) {
      const msg = err?.message || String(err) || "Unknown camera error";
      toast.error(msg);
      setScanning(false);
    }
  };

  const stopScan = () => {
    if (scannerRef) {
      try { scannerRef.stop(); } catch {}
    }
    setScanning(false);
  };

  // Build checkpoint status list
  const checkpointList = (assignments || []).map((a: any) => {
    const overrides = (a.overrides as any) || {};
    const checkpointTimes: string[] = overrides.checkpointTimes || [];
    const submissions = todaySubmissions?.filter(s => s.location_form_template_id === a.id) || [];
    
    const now = new Date();
    const currentTime = format(now, "HH:mm");

    const timeStatuses = checkpointTimes.map(time => {
      const hasSubmission = submissions.some(s => {
        const data = s.data as any;
        if (data?.grid) {
          const day = now.getDate();
          return data.grid[day]?.[time] && Object.values(data.grid[day][time]).some((v: any) => v !== "" && v !== null);
        }
        return false;
      });

      return {
        time,
        hasSubmission,
        isDue: !hasSubmission && time <= currentTime,
        isUpcoming: !hasSubmission && time > currentTime,
      };
    });

    return {
      ...a,
      checkpointTimes,
      timeStatuses,
      completedCount: timeStatuses.filter(t => t.hasSubmission).length,
      dueCount: timeStatuses.filter(t => t.isDue).length,
      totalCount: checkpointTimes.length,
    };
  }).filter((a: any) => a.totalCount > 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground px-safe pt-safe pb-6">
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/staff")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">My Checkpoints</h1>
          </div>
          <p className="text-sm opacity-90 ml-11">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* QR Scanner Button */}
        {!scanning ? (
          <Button
            onClick={startScan}
            className="w-full h-16 text-lg gap-3"
            size="lg"
          >
            <ScanLine className="h-6 w-6" />
            Scan QR Code to Complete Checkpoint
          </Button>
        ) : (
          <Card className="overflow-hidden">
            <div id="qr-reader" className="w-full" />
            <div className="p-3">
              <Button variant="outline" className="w-full" onClick={stopScan}>
                Cancel Scan
              </Button>
            </div>
          </Card>
        )}

        {/* Info */}
        <Card className="p-3 bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            You must scan the QR code at the checkpoint location to record your readings. 
            This ensures entries are verified at the correct location.
          </p>
        </Card>

        {/* Checkpoint Status */}
        {checkpointList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <QrCode className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No checkpoints assigned to your location</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground">Today's Status</h2>
            {checkpointList.map((a: any) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{(a as any).form_templates?.name}</p>
                    <p className="text-xs text-muted-foreground">{(a as any).locations?.name}</p>
                  </div>
                  <Badge 
                    variant={a.dueCount > 0 ? "destructive" : a.completedCount === a.totalCount ? "default" : "secondary"}
                  >
                    {a.completedCount}/{a.totalCount}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {a.timeStatuses.map((ts: any) => (
                    <div
                      key={ts.time}
                      className={`flex items-center gap-1 text-xs rounded-lg px-3 py-1.5 font-medium ${
                        ts.hasSubmission
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : ts.isDue
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 animate-pulse"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ts.hasSubmission ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : ts.isDue ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      {ts.time}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <StaffBottomNav />
    </div>
  );
}
