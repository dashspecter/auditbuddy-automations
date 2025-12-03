import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut as LogOutIcon, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClockInOutButtonsProps {
  todayShift: any;
  employee: any;
  onRefresh: () => void;
}

export function ClockInOutButtons({ todayShift, employee, onRefresh }: ClockInOutButtonsProps) {
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
    if (!todayShift?.shifts?.id || !employee?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("staff_id", employee.id)
        .eq("shift_id", todayShift.shifts.id)
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

  const handleClockIn = async () => {
    if (!todayShift || !employee) return;

    setIsClocking(true);
    try {
      const now = new Date();
      const shiftStartTime = todayShift.shifts.start_time;
      const [hours, minutes] = shiftStartTime.split(':').map(Number);
      
      // Create shift start datetime
      const shiftStart = new Date();
      shiftStart.setHours(hours, minutes, 0, 0);

      // Calculate if late
      const isLate = now > shiftStart;
      const lateMinutes = isLate ? Math.floor((now.getTime() - shiftStart.getTime()) / 60000) : 0;

      const { data, error } = await supabase
        .from("attendance_logs")
        .insert({
          staff_id: employee.id,
          location_id: todayShift.shifts.location_id,
          shift_id: todayShift.shifts.id,
          check_in_at: now.toISOString(),
          method: "app",
          is_late: isLate,
          late_minutes: lateMinutes,
          expected_clock_in: shiftStartTime,
          notes: isLate ? `Clocked in ${lateMinutes} minutes late` : null
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentLog(data);
      toast.success(isLate 
        ? `Clocked in (${lateMinutes}min late)` 
        : "Clocked in successfully"
      );
      onRefresh();
    } catch (error: any) {
      console.error("Clock in error:", error);
      toast.error("Failed to clock in: " + error.message);
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentLog) return;

    setIsClocking(true);
    try {
      const { error } = await supabase
        .from("attendance_logs")
        .update({ check_out_at: new Date().toISOString() })
        .eq("id", currentLog.id);

      if (error) throw error;

      setCurrentLog({ ...currentLog, check_out_at: new Date().toISOString() });
      toast.success("Clocked out successfully");
      onRefresh();
    } catch (error: any) {
      console.error("Clock out error:", error);
      toast.error("Failed to clock out: " + error.message);
    } finally {
      setIsClocking(false);
    }
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
          onClick={handleClockOut}
          disabled={isClocking}
        >
          {isClocking ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogOutIcon className="h-4 w-4 mr-2" />
          )}
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
          onClick={handleClockIn}
          disabled={isClocking}
        >
          {isClocking ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4 mr-2" />
          )}
          Clock In {lateInfo?.isLate ? '(Late)' : ''}
        </Button>
        <Button variant="outline" className="flex-1 touch-target" size="sm" disabled>
          <LogOutIcon className="h-4 w-4 mr-2" />
          Clock Out
        </Button>
      </div>
    </div>
  );
}
