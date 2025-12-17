import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut as LogOutIcon, Loader2, AlertTriangle, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClockInOutButtonsProps {
  todayShift: any;
  employee: any;
  onRefresh: () => void;
}

export function ClockInOutButtons({ todayShift, employee, onRefresh }: ClockInOutButtonsProps) {
  const navigate = useNavigate();
  const [isClocking, setIsClocking] = useState(false);
  const [currentLog, setCurrentLog] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate if late
  const lateInfo = useMemo(() => {
    if (!todayShift?.shifts?.start_time) return null;
    
    const now = new Date();
    const [hours, minutes] = todayShift.shifts.start_time.split(':').map(Number);
    const shiftStart = new Date();
    shiftStart.setHours(hours, minutes, 0, 0);
    
    if (now > shiftStart) {
      const lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);
      return { isLate: true, minutes: lateMinutes };
    }
    return { isLate: false, minutes: 0 };
  }, [todayShift]);

  useEffect(() => {
    checkExistingLog();
  }, [todayShift, employee]);

  const checkExistingLog = async () => {
    if (!employee?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Check for any attendance log today (not just by shift_id since QR scan may not link shift)
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("staff_id", employee.id)
        .gte("check_in_at", `${today}T00:00:00`)
        .order("check_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setCurrentLog(data);
      }
    } catch (error) {
      console.error("Error checking attendance log:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockAction = () => {
    // Navigate to the QR scan attendance page
    navigate("/staff/scan-attendance");
  };

  if (isLoading) {
    return (
      <div className="flex gap-2">
        <Button className="flex-1 touch-target" size="sm" disabled>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </Button>
      </div>
    );
  }

  // Already clocked out
  if (currentLog?.check_out_at) {
    return (
      <div className="text-sm text-muted-foreground text-center py-2">
        Shift completed • Clocked out at {new Date(currentLog.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    );
  }

  // Clocked in but not out
  if (currentLog && !currentLog.check_out_at) {
    return (
      <div className="flex gap-2">
        <Button className="flex-1 touch-target" size="sm" disabled variant="outline">
          <LogIn className="h-4 w-4 mr-2" />
          Clocked In
        </Button>
        <Button 
          variant="default" 
          className="flex-1 touch-target" 
          size="sm"
          onClick={handleClockAction}
        >
          <QrCode className="h-4 w-4 mr-1" />
          Clock Out
        </Button>
      </div>
    );
  }

  // Not clocked in yet
  return (
    <div className="space-y-2">
      {lateInfo?.isLate && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You're {lateInfo.minutes} minutes late! Please clock in now.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button 
          className="flex-1 touch-target" 
          size="sm"
          onClick={handleClockAction}
        >
          <QrCode className="h-4 w-4 mr-1" />
          {lateInfo?.isLate ? 'Clock In (Late)' : 'Clock In'}
        </Button>
        <Button variant="outline" className="flex-1 touch-target" size="sm" disabled>
          <LogOutIcon className="h-4 w-4 mr-1" />
          Clock Out
        </Button>
      </div>
    </div>
  );
}
