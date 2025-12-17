import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { 
  ArrowLeft, MapPin, Wrench, Calendar, FileText, 
  Printer, Copy, Plus, Edit2, ClipboardList 
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AssetStatusBadge } from "@/components/cmms/AssetStatusBadge";
import { CriticalityBadge } from "@/components/cmms/CriticalityBadge";
import { NewWorkOrderDialog } from "@/components/cmms/NewWorkOrderDialog";
import { useCmmsAssetById } from "@/hooks/useCmmsAssets";
import { useCmmsWorkOrders } from "@/hooks/useCmmsWorkOrders";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isNewWOOpen, setIsNewWOOpen] = useState(false);

  const { data: asset, isLoading } = useCmmsAssetById(id);
  const { data: workOrders } = useCmmsWorkOrders({ asset_id: id });

  const handleCopyQrLink = () => {
    if (asset?.qr_url) {
      navigator.clipboard.writeText(asset.qr_url);
      toast({ title: "QR link copied to clipboard" });
    }
  };

  const handlePrintQr = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && asset) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${asset.name}</title>
            <style>
              body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; }
              .container { text-align: center; padding: 2rem; }
              h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
              p { color: #666; margin-bottom: 1.5rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${asset.name}</h1>
              <p>${asset.asset_code}</p>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(asset.qr_url || '')}" />
              <p style="margin-top: 1rem; font-size: 0.75rem;">Scan to create a work order</p>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!asset) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold">Asset not found</h2>
          <Button variant="link" onClick={() => navigate('/cmms/assets')}>
            Back to Assets
          </Button>
        </div>
      </AppLayout>
    );
  }

  const openWorkOrders = workOrders?.filter(wo => 
    ['Open', 'OnHold', 'InProgress'].includes(wo.status)
  ) || [];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cmms/assets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{asset.name}</h1>
              <AssetStatusBadge status={asset.status} />
            </div>
            <p className="text-muted-foreground">{asset.asset_code}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/cmms/assets/${id}/edit`)}>
              <Edit2 className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
            <Button onClick={() => setIsNewWOOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Work Order
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Location</p>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{asset.location?.name || 'Not assigned'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Category</p>
                    <span className="font-medium">{asset.category?.name || '—'}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Criticality</p>
                    <CriticalityBadge criticality={asset.criticality} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Brand / Model</p>
                    <span className="font-medium">
                      {asset.brand || asset.model 
                        ? `${asset.brand || ''} ${asset.model || ''}`.trim() 
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Serial Number</p>
                    <span className="font-medium">{asset.serial_number || '—'}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Warranty</p>
                    <span className="font-medium">
                      {asset.warranty_expiry 
                        ? format(new Date(asset.warranty_expiry), 'MMM d, yyyy')
                        : '—'}
                    </span>
                  </div>
                </div>
                {asset.notes && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Work History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Work History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="work-orders">
                  <TabsList>
                    <TabsTrigger value="work-orders">
                      Work Orders ({workOrders?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="files">Files</TabsTrigger>
                  </TabsList>
                  <TabsContent value="work-orders" className="mt-4">
                    {openWorkOrders.length > 0 ? (
                      <div className="space-y-2">
                        {openWorkOrders.slice(0, 5).map((wo) => (
                          <div 
                            key={wo.id}
                            className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                            onClick={() => navigate(`/cmms/work-orders?id=${wo.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{wo.title}</span>
                              <span className="text-xs text-muted-foreground">WO #{wo.wo_number}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No open work orders for this asset.
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="files" className="mt-4">
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No files attached to this asset.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - QR Code */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg border mb-4">
                  <QRCodeSVG 
                    value={asset.qr_url || ''} 
                    size={160}
                    level="M"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Scan to create a work order
                </p>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyQrLink}>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy Link
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={handlePrintQr}>
                    <Printer className="h-4 w-4 mr-1.5" />
                    Print
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Meter Card (if applicable) */}
            {asset.meter_type && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Meter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1 capitalize">
                      {asset.meter_type}
                    </p>
                    <p className="text-2xl font-bold">
                      {asset.meter_current_value?.toLocaleString() || 0}
                    </p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Update Meter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <NewWorkOrderDialog
        open={isNewWOOpen}
        onOpenChange={setIsNewWOOpen}
        assetId={asset.id}
        locationId={asset.location_id || undefined}
      />
    </AppLayout>
  );
}
