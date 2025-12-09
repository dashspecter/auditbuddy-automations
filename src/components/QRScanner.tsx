import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const startScanner = async () => {
      if (!containerRef.current) return;

      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // On successful scan
            scanner.stop().catch(console.error);
            onScan(decodedText);
          },
          () => {
            // QR code not detected - ignore
          }
        );
      } catch (err: any) {
        console.error("Camera error:", err);
        setError(err.message || "Failed to access camera. Please allow camera permissions.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 text-white">
        <h2 className="text-lg font-semibold">Scan QR Code</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4" ref={containerRef}>
        <div className="w-full max-w-sm">
          <div id="qr-reader" className="rounded-lg overflow-hidden" />
          
          {error && (
            <div className="mt-4 p-4 bg-destructive/20 rounded-lg text-center">
              <p className="text-destructive-foreground text-sm">{error}</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={onClose}
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
