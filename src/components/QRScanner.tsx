import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

// Generate unique ID for each scanner instance
let scannerIdCounter = 0;

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [scannerId] = useState(() => `qr-reader-${++scannerIdCounter}`);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isStoppingRef = useRef(false);
  
  // Store callbacks in refs to avoid stale closures
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  // Safe stop function that checks scanner state
  const safeStopScanner = useCallback(async (scanner: Html5Qrcode | null): Promise<void> => {
    if (!scanner || isStoppingRef.current) {
      return;
    }
    
    try {
      const state = scanner.getState();
      console.log("Scanner state before stop:", state);
      
      // Only stop if actually scanning
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        isStoppingRef.current = true;
        await scanner.stop();
        console.log("Scanner stopped successfully");
      } else {
        console.log("Scanner not in scanning state, skipping stop");
      }
    } catch (err) {
      console.log("Error stopping scanner (may be expected):", err);
    } finally {
      isStoppingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    hasScannedRef.current = false;
    isStoppingRef.current = false;

    const startScanner = async () => {
      try {
        // Wait for element to be in DOM
        await new Promise(resolve => setTimeout(resolve, 150));
        
        if (!isMountedRef.current) {
          console.log("Component unmounted before scanner started");
          return;
        }
        
        const element = document.getElementById(scannerId);
        if (!element) {
          console.log("Scanner element not found:", scannerId);
          if (isMountedRef.current) {
            setError("Scanner container not found. Please try again.");
          }
          return;
        }

        console.log("Creating scanner with ID:", scannerId);
        const scanner = new Html5Qrcode(scannerId, { verbose: false });
        scannerRef.current = scanner;

        const onScanSuccess = (decodedText: string) => {
          // Prevent double scanning
          if (hasScannedRef.current || !isMountedRef.current) {
            console.log("Scan ignored - already scanned or unmounted");
            return;
          }
          hasScannedRef.current = true;
          
          console.log("QR scanned successfully:", decodedText);
          
          // Store data before stopping
          const scannedData = decodedText;
          
          // Stop scanner and then call callback
          safeStopScanner(scanner).finally(() => {
            // Wait a bit for cleanup, then call callback
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log("Calling onScan callback");
                try {
                  onScanRef.current(scannedData);
                } catch (err) {
                  console.error("Error in onScan callback:", err);
                }
              }
            }, 150);
          });
        };

        const onScanError = () => {
          // Ignore - this fires constantly when no QR is detected
        };

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          onScanSuccess,
          onScanError
        );
        
        console.log("Scanner started successfully");
        
        if (isMountedRef.current) {
          setIsStarting(false);
        }
      } catch (err: any) {
        console.error("Camera/scanner error:", err);
        if (isMountedRef.current) {
          setIsStarting(false);
          const errorMessage = err?.message || String(err);
          if (errorMessage.includes("permission") || errorMessage.includes("Permission")) {
            setError("Camera permission denied. Please allow camera access and try again.");
          } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("no camera")) {
            setError("No camera found. Please ensure your device has a camera.");
          } else {
            setError("Failed to start camera. Please try again.");
          }
        }
      }
    };

    startScanner();

    // Cleanup function
    return () => {
      console.log("QRScanner cleanup starting");
      isMountedRef.current = false;
      hasScannedRef.current = true; // Prevent any pending callbacks
      
      const scanner = scannerRef.current;
      if (scanner) {
        safeStopScanner(scanner).finally(() => {
          try {
            scanner.clear();
          } catch (e) {
            console.log("Error clearing scanner:", e);
          }
          scannerRef.current = null;
        });
      }
    };
  }, [scannerId, safeStopScanner]);

  const handleClose = useCallback(() => {
    console.log("Close button clicked");
    hasScannedRef.current = true; // Prevent scanning during close
    
    const scanner = scannerRef.current;
    if (scanner) {
      safeStopScanner(scanner).finally(() => {
        onCloseRef.current();
      });
    } else {
      onCloseRef.current();
    }
  }, [safeStopScanner]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 text-white">
        <h2 className="text-lg font-semibold">Scan QR Code</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div id={scannerId} className="rounded-lg overflow-hidden bg-black" style={{ minHeight: 280 }} />
          
          {isStarting && !error && (
            <div className="mt-4 text-center text-white/70">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Starting camera...</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-destructive/20 rounded-lg text-center">
              <p className="text-white text-sm mb-3">{error}</p>
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={handleClose}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 text-center text-white/70 text-sm">
        <Camera className="h-5 w-5 inline-block mr-2" />
        Point your camera at the kiosk QR code
      </div>
    </div>
  );
}
