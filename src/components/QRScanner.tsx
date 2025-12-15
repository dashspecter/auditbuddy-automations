import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const onScanRef = useRef(onScan);

  // Keep onScan ref updated
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        // Create unique ID to avoid conflicts
        const scannerId = "qr-reader";
        
        // Wait for element to be in DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const element = document.getElementById(scannerId);
        if (!element || !isMounted) {
          console.log("Scanner element not found or unmounted");
          return;
        }

        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Prevent double scanning
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;
            
            console.log("QR scanned:", decodedText);
            
            // Store the callback to call outside the scanner context
            const callback = onScanRef.current;
            const scannedData = decodedText;
            
            // Stop scanner first, then call callback in a safe way
            scanner.stop().then(() => {
              console.log("Scanner stopped after scan");
              // Use setTimeout to ensure we're outside the scanner callback context
              setTimeout(() => {
                try {
                  callback(scannedData);
                } catch (err) {
                  console.error("Error in scan callback:", err);
                }
              }, 50);
            }).catch((err) => {
              console.error("Error stopping scanner:", err);
              // Still call callback even if stop fails
              setTimeout(() => {
                try {
                  callback(scannedData);
                } catch (err) {
                  console.error("Error in scan callback:", err);
                }
              }, 50);
            });
          },
          () => {
            // QR code not detected - ignore
          }
        );
        
        if (isMounted) {
          setIsStarting(false);
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        if (isMounted) {
          setIsStarting(false);
          setError(err.message || "Failed to access camera. Please allow camera permissions.");
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch((err) => {
          console.log("Cleanup stop error (expected):", err);
        });
        scannerRef.current = null;
      }
    };
  }, []); // Empty deps - only run once

  const handleClose = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
    }
    onClose();
  }, [onClose]);

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
          <div id="qr-reader" className="rounded-lg overflow-hidden" />
          
          {isStarting && !error && (
            <div className="mt-4 text-center text-white/70">
              <p className="text-sm">Starting camera...</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-destructive/20 rounded-lg text-center">
              <p className="text-destructive-foreground text-sm">{error}</p>
              <Button
                variant="outline"
                className="mt-3"
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
