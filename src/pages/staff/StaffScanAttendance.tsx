import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  CheckCircle2, 
  Clock, 
  MapPin,
  LogIn,
  LogOut,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { validateQRToken } from "@/hooks/useAttendanceKiosks";
import { QRScanner } from "@/components/QRScanner";
import { useNavigate } from "react-router-dom";

const StaffScanAttendance = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<{
    type: "checkin" | "checkout";
    time: Date;
    location: string;
  } | null>(null);
  const [todayStatus, setTodayStatus] = useState<{
    checkedIn: boolean;
    checkInTime: string | null;
    checkOutTime: string | null;
    locationName: string | null;
  }>({ checkedIn: false, checkInTime: null, checkOutTime: null, locationName: null });
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use refs to avoid stale closures in callbacks
  const employeeRef = useRef<any>(null);
  const todayStatusRef = useRef(todayStatus);
  
  useEffect(() => {
    employeeRef.current = employee;
  }, [employee]);
  
  useEffect(() => {
    todayStatusRef.current = todayStatus;
  }, [todayStatus]);

  useEffect(() => {
    // Redirect if auth is done loading and no user
    if (!authLoading && !user) {
      navigate("/staff-login");
      return;
    }
    
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        await Promise.all([loadEmployee(), loadTodayStatus()]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user, authLoading, navigate]);

  const loadEmployee = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error loading employee:", error);
        return;
      }
      
      setEmployee(data);
      employeeRef.current = data;
    } catch (error) {
      console.error("Error loading employee:", error);
    }
  };

  const loadTodayStatus = async () => {
    if (!user) return;

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (empError || !empData) {
        console.log("No employee data found");
        return;
      }

      const { data: logs, error: logsError } = await supabase
        .from("attendance_logs")
        .select(`*, locations:location_id(name)`)
        .eq("staff_id", empData.id)
        .gte("check_in_at", `${today}T00:00:00`)
        .order("check_in_at", { ascending: false })
        .limit(1);

      if (logsError) {
        console.error("Error loading attendance logs:", logsError);
        return;
      }

      if (logs && logs.length > 0) {
        const log = logs[0];
        const newStatus = {
          checkedIn: !log.check_out_at,
          checkInTime: log.check_in_at,
          checkOutTime: log.check_out_at,
          locationName: log.locations?.name || null,
        };
        setTodayStatus(newStatus);
        todayStatusRef.current = newStatus;
      } else {
        const newStatus = { checkedIn: false, checkInTime: null, checkOutTime: null, locationName: null };
        setTodayStatus(newStatus);
        todayStatusRef.current = newStatus;
      }
    } catch (error) {
      console.error("Error in loadTodayStatus:", error);
    }
  };

  const handleStartScan = () => {
    setShowScanner(true);
  };

  const handleCloseScan = () => {
    setShowScanner(false);
  };

  const handleScanResult = async (qrData: string) => {
    // Close scanner first
    setShowScanner(false);
    
    // Small delay to let scanner cleanup complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Then process
    await processQRCode(qrData);
  };

  const processQRCode = async (rawData: string) => {
    setProcessing(true);
    
    try {
      console.log("Processing QR code:", rawData);
      
      // Parse QR data
      let parsed;
      try {
        parsed = JSON.parse(rawData);
      } catch (e) {
        toast.error("Invalid QR code format");
        return;
      }
      
      console.log("Parsed QR data:", parsed);
      
      // Check if this is a dynamic QR (v2)
      if (parsed.v !== 2) {
        toast.error("Invalid QR code format. Please use the location kiosk.");
        return;
      }

      // Validate the time-based token
      let validation;
      try {
        validation = validateQRToken(parsed.t);
      } catch (e) {
        console.error("Token validation error:", e);
        toast.error("Invalid QR code token");
        return;
      }
      
      console.log("Token validation:", validation);
      
      if (!validation.valid) {
        toast.error("QR code has expired. Please scan the current code.");
        return;
      }

      const locationId = parsed.l;
      console.log("Location ID from QR:", locationId);
      
      // Use ref to get current employee
      const currentEmployee = employeeRef.current;
      if (!currentEmployee) {
        toast.error("Employee profile not found. Please go back and try again.");
        return;
      }

      // Use ref to get current status
      const currentStatus = todayStatusRef.current;
      const isCheckOut = currentStatus.checkedIn;
      console.log("Is checkout:", isCheckOut, "Status:", currentStatus);
      
      // Get location name
      const { data: locationData } = await supabase
        .from("locations")
        .select("name")
        .eq("id", locationId)
        .maybeSingle();

      if (isCheckOut) {
        // Check out - update existing log
        const today = format(new Date(), "yyyy-MM-dd");
        
        const { error } = await supabase
          .from("attendance_logs")
          .update({ check_out_at: new Date().toISOString() })
          .eq("staff_id", currentEmployee.id)
          .is("check_out_at", null)
          .gte("check_in_at", `${today}T00:00:00`);

        if (error) {
          console.error("Checkout error:", error);
          toast.error(error.message || "Failed to check out");
          return;
        }

        setLastAction({
          type: "checkout",
          time: new Date(),
          location: locationData?.name || "Unknown",
        });
        
        toast.success("Checked out successfully!");
      } else {
        // Check in - create new log
        const { error } = await supabase
          .from("attendance_logs")
          .insert({
            staff_id: currentEmployee.id,
            location_id: locationId,
            check_in_at: new Date().toISOString(),
            method: "app",
          });

        if (error) {
          console.error("Checkin error:", error);
          toast.error(error.message || "Failed to check in");
          return;
        }

        setLastAction({
          type: "checkin",
          time: new Date(),
          location: locationData?.name || "Unknown",
        });
        
        toast.success("Checked in successfully!");
      }

      // Reload status with delay to ensure DB is updated
      setTimeout(() => {
        loadTodayStatus();
      }, 500);
      
    } catch (error: any) {
      console.error("Process error:", error);
      toast.error(error.message || "Failed to process attendance");
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showScanner && (
        <QRScanner onScan={handleScanResult} onClose={handleCloseScan} />
      )}
      
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/staff")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold">Attendance</h1>
            <p className="text-muted-foreground">Scan the QR code at your location</p>
          </div>

          {/* Current Status Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Today's Status</span>
              <Badge variant={todayStatus.checkedIn ? "default" : "secondary"}>
                {todayStatus.checkedIn ? "Checked In" : "Not Checked In"}
              </Badge>
            </div>
            
            {todayStatus.checkInTime && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-green-500" />
                  <span>Check In: {format(new Date(todayStatus.checkInTime), "h:mm a")}</span>
                </div>
                {todayStatus.checkOutTime && (
                  <div className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-orange-500" />
                    <span>Check Out: {format(new Date(todayStatus.checkOutTime), "h:mm a")}</span>
                  </div>
                )}
                {todayStatus.locationName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{todayStatus.locationName}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Scan Button */}
          <Card className="p-8">
            <div className="text-center">
              <Button
                size="lg"
                className="w-full h-32 text-lg gap-3"
                onClick={handleStartScan}
                disabled={processing || !employee}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Camera className="h-8 w-8" />
                    {todayStatus.checkedIn ? "Scan to Check Out" : "Scan to Check In"}
                  </>
                )}
              </Button>
              
              {!employee && (
                <p className="text-sm text-destructive mt-4">
                  Employee profile not found. Please contact your manager.
                </p>
              )}
              
              <p className="text-sm text-muted-foreground mt-4">
                Point your camera at the QR code displayed on the location kiosk
              </p>
            </div>
          </Card>

          {/* Last Action */}
          {lastAction && (
            <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <div className="font-medium">
                    {lastAction.type === "checkin" ? "Checked In" : "Checked Out"} Successfully
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(lastAction.time, "h:mm a")} at {lastAction.location}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Time Display */}
          <div className="text-center text-muted-foreground">
            <Clock className="h-5 w-5 inline-block mr-2" />
            {format(new Date(), "EEEE, MMMM d • h:mm a")}
          </div>
        </div>
      </div>
    </>
  );
};

export default StaffScanAttendance;