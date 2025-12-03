import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Clock, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";
import { useKioskByToken, generateQRToken } from "@/hooks/useAttendanceKiosks";
import { supabase } from "@/integrations/supabase/client";

const AttendanceKiosk = () => {
  const { token } = useParams<{ token: string }>();
  const { data: kiosk, isLoading, error } = useKioskByToken(token);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [qrData, setQrData] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
    const token = generateQRToken(kiosk.location_id, timestamp);
    const qrPayload = JSON.stringify({
      t: token,
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

  // Update last_active_at periodically
  useEffect(() => {
    if (!kiosk) return;
    
    const updateActivity = async () => {
      await supabase
        .from("attendance_kiosks")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", kiosk.id);
    };
    
    updateActivity();
    const activityTimer = setInterval(updateActivity, 60000); // Every minute
    
    return () => clearInterval(activityTimer);
  }, [kiosk]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !kiosk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="h-24 w-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Kiosk</h1>
          <p className="text-muted-foreground">
            This kiosk link is invalid or has been deactivated. Please contact your manager.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      {/* Header */}
      <div className="p-6 text-center border-b bg-card">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <MapPin className="h-5 w-5" />
          <span className="font-semibold text-lg">{kiosk.locations?.name}</span>
        </div>
        <div className="text-4xl font-bold tracking-tight">
          {format(currentTime, "HH:mm:ss")}
        </div>
        <div className="text-muted-foreground">
          {format(currentTime, "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      {/* Main QR Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-card rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-center mb-6">
            Scan to Check In/Out
          </h2>
          
          <div className="bg-white p-6 rounded-2xl flex items-center justify-center mb-6">
            {qrData && (
              <QRCodeSVG
                value={qrData}
                size={280}
                level="H"
                includeMargin
                className="w-full h-auto max-w-[280px]"
              />
            )}
          </div>

          {/* Countdown indicator */}
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className={`h-4 w-4 ${countdown <= 5 ? 'animate-spin text-primary' : ''}`} />
            <span className="text-sm">
              New code in <span className="font-mono font-bold text-foreground">{countdown}s</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 30) * 100}%` }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center max-w-md">
          <p className="text-muted-foreground">
            Open your staff app and scan this QR code to record your attendance.
            The code refreshes every 30 seconds for security.
          </p>
        </div>
      </div>

      {/* Footer status */}
      <div className="p-4 border-t bg-card flex items-center justify-between text-sm">
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
        <div className="text-muted-foreground">
          {kiosk.device_name}
        </div>
      </div>
    </div>
  );
};

export default AttendanceKiosk;
