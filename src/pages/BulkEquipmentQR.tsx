import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEquipment } from "@/hooks/useEquipment";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG } from "qrcode.react";

export default function BulkEquipmentQR() {
  const navigate = useNavigate();
  const { data: equipment, isLoading } = useEquipment();

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/equipment")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Equipment
            </Button>
            <h1 className="text-2xl font-bold">Equipment QR Labels</h1>
          </div>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Labels
          </Button>
        </div>

        <div className="print:p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-2">
            {equipment?.map((item) => (
              <Card key={item.id} className="break-inside-avoid print:border-2 print:border-dashed print:border-gray-400">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                  <div className="bg-white p-3 rounded-lg">
                    <QRCodeSVG
                      value={`${window.location.protocol}//${window.location.host}/equipment/${item.id}`}
                      size={180}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <div className="space-y-1 w-full">
                    <h3 className="font-bold text-lg leading-tight break-words">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.locations?.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {item.id.slice(0, 8)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      {(!equipment || equipment.length === 0) && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No equipment found to generate labels.</p>
        </div>
      )}

      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          @page {
            size: A4;
            margin: 0.5cm;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          
          .print\\:gap-2 {
            gap: 0.5rem !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:border-2 {
            border-width: 2px !important;
          }
          
          .print\\:border-dashed {
            border-style: dashed !important;
          }
          
          .print\\:border-gray-400 {
            border-color: rgb(156, 163, 175) !important;
          }
          
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
