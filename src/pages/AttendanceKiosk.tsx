import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, RefreshCw, Wifi, WifiOff, Monitor, TriangleAlert } from "lucide-react";
import { format } from "date-fns";
import { useKioskByToken, generateQRToken } from "@/hooks/useAttendanceKiosks";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { KioskDashboard } from "@/components/kiosk/KioskDashboard";

const AttendanceKiosk = () => {
  const { token } = useParams<{ token: string }>();
  const kioskToken = (() => {
    try {
      return decodeURIComponent(token ?? "").trim();
    } catch {
      return (token ?? "").trim();
    }
  })();
  const { data: kiosk, isLoading, error, refetch } = useKioskByToken(token);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [qrData, setQrData] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Request wake lock to prevent screen sleep (kiosk mode)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
          console.log('Wake lock acquired');
          
          wakeLockRef.current.addEventListener('release', () => {
            setWakeLockActive(false);
            console.log('Wake lock released');
          });
        }
      } catch (err) {
        console.log('Wake lock not available:', err);
      }
    };

    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate new QR code every 30 seconds
  const generateNewQR = useCallback(() => {
    if (!kiosk) return;
    
    const timestamp = Date.now();
    const qrToken = generateQRToken(kiosk.location_id, timestamp);
    const qrPayload = JSON.stringify({
      t: qrToken,
      l: kiosk.location_id,
      v: 2, // Version for dynamic QR
    });
    setQrData(qrPayload);
    setCountdown(30);
  }, [kiosk]);

  // Refresh QR every 30 seconds
  useEffect(() => {
    if (!kiosk) return;
    
    generateNewQR();
    const qrTimer = setInterval(generateNewQR, 30000);
    
    return () => clearInterval(qrTimer);
  }, [kiosk, generateNewQR]);

  // Countdown timer
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 30);
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, []);

  // Update last_active_at periodically (keep-alive)
  useEffect(() => {
    if (!kiosk) return;
    
    const updateActivity = async () => {
      try {
        await supabase
          .from("attendance_kiosks")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", kiosk.id);
      } catch (err) {
        console.log('Activity update failed:', err);
      }
    };
    
    updateActivity();
    // Update every 30 seconds to keep connection alive
    const activityTimer = setInterval(updateActivity, 30000);
    
    return () => clearInterval(activityTimer);
  }, [kiosk]);

  // Online/offline detection with auto-reconnect
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Refetch kiosk data when coming back online
      refetch();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetch]);

  // Prevent page from timing out - periodic ping
  useEffect(() => {
    // Click handler to keep page active on touch devices
    const keepAlive = () => {
      console.log('Keep-alive ping');
    };
    
    // Ping every 2 minutes
    const keepAliveTimer = setInterval(keepAlive, 2 * 60 * 1000);
    
    return () => clearInterval(keepAliveTimer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !kiosk) {
    const rawToken = token ?? "";
    const normalizedToken = (() => {
      try {
        return decodeURIComponent(rawToken).trim();
      } catch {
        return rawToken.trim();
      }
    })();

    const message = (() => {
      if (!error) return `No active kiosk found for: ${normalizedToken || "(empty)"}`;
      if (typeof error === "string") return error;
      if (error instanceof Error) return error.message;

      const e = error as any;
      return (
        e?.message ||
        e?.error_description ||
        e?.details ||
        e?.hint ||
        (() => {
          try {
            return JSON.stringify(e);
          } catch {
            return String(e);
          }
        })()
      );
    })();

    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="h-24 w-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <TriangleAlert className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Kiosk</h1>
          <p className="text-muted-foreground">
            This kiosk link is invalid or temporarily unavailable. If this keeps happening, please contact your manager.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>

          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground">Details</summary>
            <div className="mt-2 rounded-md bg-muted p-3 text-xs font-mono text-muted-foreground break-words space-y-1">
              <div>token: {rawToken || "(empty)"}</div>
              <div>normalized: {normalizedToken || "(empty)"}</div>
              <div>error: {message}</div>
            </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      {/* Header */}
      <div className="p-4 text-center border-b bg-card flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-5 w-5" />
          <span className="font-semibold text-lg">
            {kiosk.locations?.name}
            {(kiosk as any).departments?.name && (
              <span className="text-muted-foreground font-normal text-sm ml-2">
                — {(kiosk as any).departments.name}
              </span>
            )}
          </span>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tracking-tight">
            {format(currentTime, "HH:mm:ss")}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(currentTime, "EEEE, MMMM d, yyyy")}
          </div>
        </div>
      </div>

      {/* Main Content - Split View (responsive: stacked on tablet, side-by-side on desktop) */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* QR Code Section */}
        {/* Tablet (<1280px): compact horizontal bar at top */}
        {/* Desktop (>=1280px): tall sidebar on left */}
        <div className="xl:w-[400px] flex-shrink-0 flex xl:flex-col items-center justify-center p-4 xl:p-6 border-b xl:border-b-0 xl:border-r bg-card/50">
          <div className="bg-card rounded-3xl shadow-2xl p-4 xl:p-6 flex xl:flex-col items-center gap-4 xl:gap-0 w-full xl:max-w-sm">
            <h2 className="hidden xl:block text-xl font-bold text-center mb-4">
              Scan to Check In/Out
            </h2>
            
            <div className="bg-white p-2 xl:p-4 rounded-2xl flex items-center justify-center xl:mb-4 flex-shrink-0">
              {qrData && (
                <QRCodeSVG
                  value={qrData}
                  size={220}
                  level="H"
                  includeMargin
                  className="w-[120px] h-[120px] xl:w-full xl:h-auto xl:max-w-[220px]"
                />
              )}
            </div>

            {/* Text + countdown (beside QR on tablet, below QR on desktop) */}
            <div className="flex-1 xl:flex-initial flex flex-col items-center xl:items-center gap-1">
              <h2 className="xl:hidden text-base font-bold">
                Scan to Check In/Out
              </h2>
              {/* Countdown indicator */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className={`h-4 w-4 ${countdown <= 5 ? 'animate-spin text-primary' : ''}`} />
                <span className="text-sm">
                  New code in <span className="font-mono font-bold text-foreground">{countdown}s</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-[200px] xl:max-w-none mt-1 xl:mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 30) * 100}%` }}
                />
              </div>

              {/* Instructions (desktop only) */}
              <p className="hidden xl:block text-sm text-muted-foreground mt-4 text-center">
                Scan with your staff app to record attendance
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <div className="flex-1 overflow-hidden min-h-0">
          <KioskDashboard 
            locationId={kiosk.location_id} 
            companyId={kiosk.company_id} 
            kioskToken={kioskToken}
            departmentId={kiosk.department_id}
          />
        </div>
      </div>

      {/* Footer status */}
      <div className="p-3 border-t bg-card flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-destructive" />
                <span className="text-destructive">Offline</span>
              </>
            )}
          </div>
          {wakeLockActive && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Monitor className="h-3 w-3" />
              <span className="text-xs">Kiosk Mode</span>
            </div>
          )}
        </div>
        <div className="text-muted-foreground">
          {kiosk.device_name}
        </div>
      </div>
    </div>
  );
};

export default AttendanceKiosk;
