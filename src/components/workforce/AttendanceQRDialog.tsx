import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocations } from "@/hooks/useLocations";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer } from "lucide-react";

interface AttendanceQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AttendanceQRDialog = ({
  open,
  onOpenChange,
}: AttendanceQRDialogProps) => {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [qrType, setQrType] = useState<"checkin" | "checkout">("checkin");
  const { data: locations = [] } = useLocations();

  const qrData = selectedLocation
    ? JSON.stringify({
        type: qrType,
        locationId: selectedLocation,
        timestamp: Date.now(),
      })
    : "";

  const handleDownload = () => {
    const svg = document.getElementById("attendance-qr");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `${qrType}-${selectedLocation}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=600,height=600");
    if (!printWindow) return;

    const location = locations.find((l) => l.id === selectedLocation);
    const svg = document.getElementById("attendance-qr");
    if (!svg) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance QR Code - ${qrType === "checkin" ? "Check In" : "Check Out"}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            h1 { margin: 0 0 10px 0; }
            h2 { margin: 0 0 30px 0; color: #666; }
            .qr-container { text-align: center; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${qrType === "checkin" ? "Check In" : "Check Out"}</h1>
            <h2>${location?.name || "Location"}</h2>
            ${svg.outerHTML}
            <p style="margin-top: 20px; color: #999;">Scan to ${qrType === "checkin" ? "check in" : "check out"}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Attendance QR Code</DialogTitle>
          <DialogDescription>
            Create a QR code for staff to scan when checking in or out
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>QR Code Type</Label>
            <Select
              value={qrType}
              onValueChange={(value: "checkin" | "checkout") => setQrType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkin">Check In</SelectItem>
                <SelectItem value="checkout">Check Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLocation && (
            <>
              <div className="flex justify-center py-6 bg-muted/30 rounded-lg">
                <QRCodeSVG
                  id="attendance-qr"
                  value={qrData}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
