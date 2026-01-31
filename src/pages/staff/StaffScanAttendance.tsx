import { useState, useEffect, useRef, useCallback } from "react";
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
  ArrowLeft,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { validateQRToken } from "@/hooks/useAttendanceKiosks";
import { QRScanner } from "@/components/QRScanner";
import { useNavigate } from "react-router-dom";
import { WelcomeClockInDialog } from "@/components/staff/WelcomeClockInDialog";
import { useStaffClockInReminders } from "@/hooks/useClockInReminders";
import { useScheduleGovernanceEnabled, useWorkforcePolicy } from "@/hooks/useScheduleGovernance";
import { useCompany } from "@/hooks/useCompany";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Safe time formatter that won't crash
const safeFormatTime = (dateString: string | null): string => {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "h:mm a");
  } catch {
    return dateString;
  }
};

const StaffScanAttendance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: reminders = [] } = useStaffClockInReminders();
  const { data: company } = useCompany();
  const isGovernanceEnabled = useScheduleGovernanceEnabled();
  
  const [showScanner, setShowScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [blockedLocationId, setBlockedLocationId] = useState<string | null>(null);
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
    pendingException?: boolean;
  }>({ checkedIn: false, checkInTime: null, checkOutTime: null, locationName: null });
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use refs to avoid stale closures in callbacks and track mounted state
  const isMountedRef = useRef(true);
  const employeeRef = useRef<any>(null);
  const todayStatusRef = useRef(todayStatus);
  
  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    employeeRef.current = employee;
  }, [employee]);
  
  useEffect(() => {
    todayStatusRef.current = todayStatus;
  }, [todayStatus]);

  useEffect(() => {
    // ProtectedRoute handles auth redirects - just load data when user is present
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const loadData = async () => {
      try {
        await Promise.all([loadEmployee(), loadTodayStatus()]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user]);

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
    if (!isMountedRef.current) return;
    console.log("Starting scanner...");
    setShowScanner(true);
  };

  const handleCloseScan = useCallback(() => {
    console.log("Closing scanner...");
    if (isMountedRef.current) {
      setShowScanner(false);
    }
  }, []);

  const handleScanResult = useCallback(async (qrData: string) => {
    console.log("=== handleScanResult called ===", qrData);
    
    // Close scanner first - check if still mounted
    if (!isMountedRef.current) {
      console.log("Component not mounted, ignoring scan result");
      return;
    }
    
    setShowScanner(false);
    
    // Small delay to let scanner cleanup complete
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check if still mounted after delay
    if (!isMountedRef.current) return;
    
    // Then process with comprehensive error handling
    try {
      // Validate we have a user before proceeding
      if (!user) {
        toast.error("Session expired. Please log in again.");
        navigate("/staff/login");
        return;
      }
      
      // Ensure we have employee data
      if (!employeeRef.current) {
        // Try to reload employee data
        await loadEmployee();
        if (!employeeRef.current) {
          toast.error("Could not find your employee profile. Please contact your manager.");
          return;
        }
      }
      
      await processQRCode(qrData);
    } catch (error: any) {
      console.error("Scan result processing error:", error);
      toast.error(error?.message || "Failed to process scan. Please try again.");
      if (isMountedRef.current) {
        setProcessing(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const processQRCode = async (rawData: string) => {
    console.log("=== processQRCode START ===");
    console.log("Raw QR data received:", rawData);
    console.log("Raw data type:", typeof rawData);
    console.log("Raw data length:", rawData?.length);
    
    // Safety check - make sure component is still mounted and user exists
    if (!isMountedRef.current || !user) {
      console.log("Component unmounted or no user, aborting processQRCode");
      return;
    }
    
    setProcessing(true);
    
    try {
      // Clean up the raw data - trim whitespace and handle potential encoding issues
      const cleanedData = rawData?.trim();
      
      if (!cleanedData) {
        console.error("Empty QR data received");
        toast.error("Could not read QR code. Please try again.");
        return;
      }
      
      console.log("Cleaned QR data:", cleanedData);
      
      // Parse QR data - handle potential edge cases
      let parsed;
      try {
        parsed = JSON.parse(cleanedData);
      } catch (e) {
        console.error("JSON parse error:", e);
        console.error("Failed to parse:", cleanedData);
        
        // Check if it's a URL that contains the data
        if (cleanedData.startsWith('http')) {
          toast.error("Please scan the QR code displayed on the kiosk, not a URL.");
        } else {
          toast.error("Invalid QR code format. Please scan the kiosk QR code.");
        }
        return;
      }
      
      console.log("Parsed QR data:", parsed);
      
      // Check if this is a dynamic QR (v2) - be flexible with type checking
      if (!parsed || parsed.v !== 2) {
        console.error("Invalid QR version:", parsed?.v);
        toast.error("Invalid QR code. Please scan the current kiosk QR code.");
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
      
      // Validate location ID exists
      if (!locationId) {
        toast.error("Invalid QR code - missing location information");
        return;
      }
      
      // Use ref to get current employee
      const currentEmployee = employeeRef.current;
      if (!currentEmployee) {
        toast.error("Employee profile not found. Please go back and try again.");
        return;
      }
      
      // Validate employee has an ID
      if (!currentEmployee.id) {
        toast.error("Invalid employee data. Please log out and log in again.");
        return;
      }

      // Use ref to get current status
      const currentStatus = todayStatusRef.current;
      const isCheckOut = currentStatus.checkedIn;
      console.log("Is checkout:", isCheckOut, "Status:", currentStatus);
      
      // Get location name
      const { data: locationData, error: locationError } = await supabase
        .from("locations")
        .select("name")
        .eq("id", locationId)
        .maybeSingle();
      
      if (locationError) {
        console.error("Error fetching location:", locationError);
      }

      if (isCheckOut) {
        // Check out - first find the open attendance log
        const today = format(new Date(), "yyyy-MM-dd");
        
        // First, find the attendance log to update
        const { data: openLog, error: findError } = await supabase
          .from("attendance_logs")
          .select("id")
          .eq("staff_id", currentEmployee.id)
          .is("check_out_at", null)
          .gte("check_in_at", `${today}T00:00:00`)
          .order("check_in_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (findError) {
          console.error("Error finding open log:", findError);
          toast.error("Failed to find open attendance record");
          return;
        }

        if (!openLog) {
          console.error("No open attendance log found");
          toast.error("No open clock-in record found for today");
          // Reset local state since there's no open record
          setTodayStatus(prev => ({ ...prev, checkedIn: false }));
          todayStatusRef.current = { ...todayStatusRef.current, checkedIn: false };
          return;
        }

        // Now update by specific ID
        const checkOutTime = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("attendance_logs")
          .update({ check_out_at: checkOutTime })
          .eq("id", openLog.id);

        if (updateError) {
          console.error("Checkout error:", updateError);
          toast.error(updateError.message || "Failed to check out");
          return;
        }

        console.log("Checkout successful, updating state...");
        
        // Update local state immediately - check if still mounted
        if (isMountedRef.current) {
          try {
            const checkOutTime = new Date().toISOString();
            setTodayStatus(prev => ({
              ...prev,
              checkedIn: false,
              checkOutTime
            }));
            todayStatusRef.current = {
              ...todayStatusRef.current,
              checkedIn: false,
              checkOutTime
            };
            console.log("State updated successfully");
          } catch (stateError) {
            console.error("Error updating state:", stateError);
          }
        }
        
        toast.success("Checked out successfully!");
        console.log("=== processQRCode CHECKOUT COMPLETE ===");
      } else {
        // Check in - create new log
        console.log("Creating check-in record...");
        
        // Find the employee's assigned shift for today at this location
        const today = format(new Date(), "yyyy-MM-dd");
        const now = new Date();
        
        // Use RPC for governance-enabled check or fallback to simple query
        let scheduledShift: any = null;
        let isUnscheduled = false;
        let isLate = false;
        let lateMinutes = 0;
        let policy: any = null; // Fetch ONCE and reuse
        
        if (isGovernanceEnabled && company?.id) {
          // FETCH POLICY ONCE at the start - critical for consistent enforcement
          const { data: policyData } = await supabase.rpc('get_workforce_policy', {
            p_company_id: company.id,
            p_location_id: locationId
          });
          
          policy = policyData || { 
            unscheduled_clock_in_policy: 'allow',
            late_threshold_minutes: 15,
            grace_minutes: 60
          };
          
          const graceMinutes = policy.grace_minutes ?? 60;
          
          // Use the RPC to find scheduled shift with policy's grace window
          const { data: rpcResult } = await supabase.rpc('find_scheduled_shift_for_clockin', {
            p_company_id: company.id,
            p_employee_id: currentEmployee.id,
            p_location_id: locationId,
            p_check_time: now.toISOString(),
            p_grace_minutes: graceMinutes
          });
          
          // RPC returns an array, get first result
          const shiftResult = Array.isArray(rpcResult) && rpcResult.length > 0 ? rpcResult[0] : null;
          
          if (shiftResult) {
            scheduledShift = { shift_id: shiftResult.shift_id };
            isLate = shiftResult.is_late || false;
            lateMinutes = shiftResult.late_minutes || 0;
          } else {
            isUnscheduled = true;
          }
          
          console.log("Governance enabled. Policy:", policy, "Scheduled:", !!scheduledShift, "Unscheduled:", isUnscheduled);
          
          // Handle unscheduled clock-in based on policy BEFORE creating attendance
          if (isUnscheduled) {
            if (policy.unscheduled_clock_in_policy === 'block') {
              // Block the clock-in - do NOT create attendance record
              console.log("Clock-in blocked - no scheduled shift");
              setBlockedLocationId(locationId);
              setShowBlockedDialog(true);
              return; // EXIT - attendance not created
            }
          }
        } else {
          // Non-governance flow - simple shift lookup
          const { data: todayShift } = await supabase
            .from("shift_assignments")
            .select(`
              shift_id,
              shifts!inner(id, shift_date, location_id)
            `)
            .eq("staff_id", currentEmployee.id)
            .eq("shifts.shift_date", today)
            .eq("shifts.location_id", locationId)
            .eq("approval_status", "approved")
            .maybeSingle();
          
          scheduledShift = todayShift;
          isUnscheduled = !todayShift;
        }
        
        console.log("Found shift for today:", scheduledShift);
        
        // Create attendance log
        const checkInTime = new Date().toISOString();
        const { data: newAttendance, error } = await supabase
          .from("attendance_logs")
          .insert({
            staff_id: currentEmployee.id,
            location_id: locationId,
            check_in_at: checkInTime,
            method: "app",
            shift_id: scheduledShift?.shift_id || null,
            is_late: isLate,
            late_minutes: lateMinutes > 0 ? lateMinutes : null,
          })
          .select('id')
          .single();

        if (error) {
          console.error("Checkin error:", error);
          toast.error(error.message || "Failed to check in");
          return;
        }

        // Create workforce exception if governance is enabled and conditions met
        // Use policy already fetched above - no duplicate fetch
        if (isGovernanceEnabled && company?.id && newAttendance && policy) {
          // Helper to check for existing pending exception (dedupe)
          const checkExistingException = async (exceptionType: string): Promise<boolean> => {
            const { data: existing } = await supabase
              .from('workforce_exceptions')
              .select('id')
              .eq('company_id', company.id)
              .eq('location_id', locationId)
              .eq('employee_id', currentEmployee.id)
              .eq('exception_type', exceptionType)
              .eq('shift_date', today)
              .eq('status', 'pending')
              .limit(1)
              .maybeSingle();
            return !!existing;
          };
          
          // Create exception for unscheduled shift (if policy is exception_ticket)
          if (isUnscheduled && policy.unscheduled_clock_in_policy === 'exception_ticket') {
            // Dedupe: check if pending exception already exists
            const alreadyExists = await checkExistingException('unscheduled_shift');
            if (!alreadyExists) {
              await supabase.from('workforce_exceptions').insert({
                company_id: company.id,
                location_id: locationId,
                employee_id: currentEmployee.id,
                exception_type: 'unscheduled_shift',
                status: 'pending',
                shift_date: today,
                detected_at: checkInTime,
                attendance_id: newAttendance.id,
                requested_by: user?.id,
                metadata: { clock_in_time: checkInTime }
              });
              
              console.log("Created unscheduled_shift exception");
              toast.info("Clock-in recorded. Pending manager approval.", { duration: 5000 });
            } else {
              console.log("Skipping duplicate unscheduled_shift exception");
            }
          }
          
          // Create exception for late start (if above threshold)
          if (isLate && lateMinutes > 0) {
            const threshold = policy.late_threshold_minutes || 15;
            if (lateMinutes >= threshold) {
              // Dedupe: check if pending exception already exists
              const alreadyExists = await checkExistingException('late_start');
              if (!alreadyExists) {
                await supabase.from('workforce_exceptions').insert({
                  company_id: company.id,
                  location_id: locationId,
                  employee_id: currentEmployee.id,
                  exception_type: 'late_start',
                  status: 'pending',
                  shift_id: scheduledShift?.shift_id,
                  shift_date: today,
                  detected_at: checkInTime,
                  attendance_id: newAttendance.id,
                  requested_by: user?.id,
                  metadata: { late_minutes: lateMinutes }
                });
                
                console.log("Created late_start exception");
              } else {
                console.log("Skipping duplicate late_start exception");
              }
            }
          }
        }

        console.log("Check-in successful, updating state...");
        if (isMountedRef.current) {
          try {
            const newStatus = {
              checkedIn: true,
              checkInTime,
              checkOutTime: null,
              locationName: locationData?.name || null,
              pendingException: isUnscheduled && isGovernanceEnabled
            };
            setTodayStatus(newStatus);
            todayStatusRef.current = newStatus;
            console.log("State updated successfully");
            
            // Show welcome dialog after successful check-in
            setShowWelcomeDialog(true);
          } catch (stateError) {
            console.error("Error updating state:", stateError);
          }
        }
        
        toast.success("Checked in successfully!");
        console.log("=== processQRCode CHECKIN COMPLETE ===");
      }
      
    } catch (error: any) {
      console.error("Process error:", error);
      toast.error(error.message || "Failed to process attendance");
    } finally {
      if (isMountedRef.current) {
        setProcessing(false);
      }
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
      
      <WelcomeClockInDialog
        open={showWelcomeDialog}
        onClose={() => setShowWelcomeDialog(false)}
        employeeName={employee?.full_name?.split(" ")[0] || ""}
        reminders={reminders.map(r => r.message)}
      />
      
      {/* Blocked Clock-in Dialog - shown when policy=block and no scheduled shift */}
      <AlertDialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clock-In Blocked
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You don't have a scheduled shift at this location right now.
              </p>
              <p className="text-sm">
                Your company's attendance policy requires a scheduled shift to clock in. 
                Contact your manager if you believe this is an error.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => {
              setShowBlockedDialog(false);
              setBlockedLocationId(null);
            }}>
              Close
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                // Request exception - creates workforce_exception without attendance
                if (company?.id && employee?.id && blockedLocationId && user?.id) {
                  const today = format(new Date(), "yyyy-MM-dd");
                  const now = new Date().toISOString();
                  
                  // Check for existing pending exception first (dedupe)
                  const { data: existing } = await supabase
                    .from('workforce_exceptions')
                    .select('id')
                    .eq('company_id', company.id)
                    .eq('location_id', blockedLocationId)
                    .eq('employee_id', employee.id)
                    .eq('exception_type', 'unscheduled_shift')
                    .eq('shift_date', today)
                    .eq('status', 'pending')
                    .limit(1)
                    .maybeSingle();
                  
                  if (existing) {
                    toast.info("You already have a pending approval request for today.");
                  } else {
                    await supabase.from('workforce_exceptions').insert({
                      company_id: company.id,
                      location_id: blockedLocationId,
                      employee_id: employee.id,
                      exception_type: 'unscheduled_shift',
                      status: 'pending',
                      shift_date: today,
                      detected_at: now,
                      requested_by: user.id,
                      metadata: { 
                        clock_in_time: now, 
                        reason_requested: true,
                        blocked_by_policy: true 
                      }
                    });
                    toast.success("Manager approval requested. You'll be notified when approved.");
                  }
                }
                setShowBlockedDialog(false);
                setBlockedLocationId(null);
              }}
              className="bg-primary"
            >
              Request Manager Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
          <Card className={`p-6 ${todayStatus.checkedIn ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Today's Status</span>
              <Badge 
                variant={todayStatus.checkedIn ? "default" : "secondary"}
                className={todayStatus.checkedIn ? "bg-green-500 hover:bg-green-600" : ""}
              >
                {todayStatus.checkedIn ? "✓ Clocked In" : "Not Checked In"}
              </Badge>
            </div>
            
            {todayStatus.checkInTime && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-green-500" />
                  <span>Check In: {safeFormatTime(todayStatus.checkInTime)}</span>
                </div>
                {todayStatus.checkOutTime && (
                  <div className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-orange-500" />
                    <span>Check Out: {safeFormatTime(todayStatus.checkOutTime)}</span>
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

          {/* Clocked In Status - Show when checked in */}
          {todayStatus.checkedIn && !todayStatus.checkOutTime && (
            <Card className="p-8 border-green-500 bg-green-50 dark:bg-green-950/30">
              <div className="text-center">
                <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">
                  You're Clocked In!
                </h2>
                <p className="text-green-600 dark:text-green-500 mb-4">
                  Since {safeFormatTime(todayStatus.checkInTime)}
                  {todayStatus.locationName ? ` at ${todayStatus.locationName}` : ""}
                </p>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-16 text-lg gap-3 border-green-500 text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/50"
                  onClick={handleStartScan}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-6 w-6" />
                      Scan to Clock Out
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Scan to Check In - Only show when NOT checked in */}
          {!todayStatus.checkedIn && (
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
                      Scan to Check In
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
          )}

          {/* Already Checked Out Today */}
          {todayStatus.checkOutTime && (
            <Card className="p-6 border-muted">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold text-muted-foreground mb-2">
                  Shift Complete
                </h2>
                <p className="text-sm text-muted-foreground">
                  You clocked out at {format(new Date(todayStatus.checkOutTime), "h:mm a")}
                </p>
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