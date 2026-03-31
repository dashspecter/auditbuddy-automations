import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, MapPin, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function ManagerClockInCard() {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [attendanceLog, setAttendanceLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>("");

  useEffect(() => {
    if (authLoading || !user?.id || !isMobile) {
      if (!authLoading) setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        const { data: emp } = await supabase
          .from("employees")
          .select("id, location_id, locations(name)")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (cancelled) return;

        if (!emp) {
          setLoading(false);
          return;
        }

        setEmployee(emp);
        setLocationName((emp.locations as any)?.name || "");

        const today = new Date().toISOString().split("T")[0];
        const { data: log } = await supabase
          .from("attendance_logs")
          .select("id, check_in_at, check_out_at, locations(name)")
          .eq("staff_id", emp.id)
          .gte("check_in_at", `${today}T00:00:00`)
          .order("check_in_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (log) {
          setAttendanceLog(log);
          if ((log.locations as any)?.name) {
            setLocationName((log.locations as any).name);
          }
        }
      } catch (err) {
        console.error("[ManagerClockInCard] Error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [user?.id, isMobile, authLoading]);

  // Don't render on desktop or if no employee record
  if (!isMobile || loading) return null;
  if (!employee) return null;

  const isClockedIn = attendanceLog && !attendanceLog.check_out_at;
  const isCompleted = attendanceLog?.check_out_at;

  const clockInTime = attendanceLog?.check_in_at
    ? new Date(attendanceLog.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  const clockOutTime = attendanceLog?.check_out_at
    ? new Date(attendanceLog.check_out_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {locationName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{locationName}</span>
              </div>
            )}
            {isCompleted ? (
              <div className="flex items-center gap-1.5 text-sm text-success font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Shift done • {clockInTime} – {clockOutTime}</span>
              </div>
            ) : isClockedIn ? (
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                <span>Clocked in at {clockInTime}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not clocked in</p>
            )}
          </div>

          {!isCompleted && (
            <Button
              size="sm"
              variant={isClockedIn ? "outline" : "default"}
              className="shrink-0 touch-target"
              onClick={() => navigate("/staff/scan-attendance")}
            >
              <QrCode className="h-4 w-4 mr-1.5" />
              {isClockedIn ? "Clock Out" : "Clock In"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
