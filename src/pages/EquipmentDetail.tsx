import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, FileText, Wrench, QrCode, Download, ClipboardCheck, ExternalLink, Building2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEquipmentById } from "@/hooks/useEquipment";
import { useEquipmentDocuments } from "@/hooks/useEquipmentDocuments";
import { useEquipmentInterventions } from "@/hooks/useEquipmentInterventions";
import { useEquipmentChecks } from "@/hooks/useEquipmentChecks";
import { useMaintenanceEvents } from "@/hooks/useMaintenanceEvents";
import { useEquipmentStatusHistory } from "@/hooks/useEquipmentStatusHistory";
import { ScheduleInterventionDialog } from "@/components/ScheduleInterventionDialog";
import { EquipmentCheckDialog } from "@/components/equipment/EquipmentCheckDialog";
import { MaintenanceEventDialog } from "@/components/equipment/MaintenanceEventDialog";
import { EquipmentRiskBadge } from "@/components/equipment/EquipmentRiskBadge";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export default function EquipmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showCheckDialog, setShowCheckDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  
  const { user } = useAuth();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const isManager = user && !roleLoading && (roleData?.isManager || roleData?.isAdmin);

  const { data: equipment, isLoading, error } = useEquipmentById(id || "");
  const { data: documents } = useEquipmentDocuments(id || "");
  const { data: interventions } = useEquipmentInterventions(user ? (id || "") : undefined);
  const { data: checks } = useEquipmentChecks(id);
  const { data: maintenanceEvents } = useMaintenanceEvents(id);
  const { data: statusHistory } = useEquipmentStatusHistory(id);
  
  // For QR codes to work, they must use the published app URL
  const equipmentUrl = `${window.location.origin}/equipment/${id}`;

  const downloadQRCode = () => {
    const svg = document.getElementById("equipment-qr-code");
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
      downloadLink.download = `${equipment?.name || 'equipment'}-qr-code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Unable to load equipment</p>
          <p className="text-muted-foreground">{error.message || "Equipment not found"}</p>
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-center text-muted-foreground">Equipment not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Company Branding Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {equipment.companies?.logo_url ? (
              <img 
                src={equipment.companies.logo_url} 
                alt={equipment.companies.name || "Company"} 
                className="h-10 w-10 object-contain rounded"
              />
            ) : (
              <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <span className="font-semibold text-foreground">
              {equipment.companies?.name || "Equipment Profile"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!user && (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dashspect Branding Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-10">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <img 
            src="/dashspect-logo-512.png" 
            alt="Dashspect" 
            className="h-5 w-auto"
          />
          <span className="text-xs font-medium text-primary">Dashspect</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 pb-16 space-y-4">
        {/* Public notice for unauthenticated users */}
        {!user && (
          <div className="bg-muted/50 border border-border rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">
              You're viewing public equipment details. Sign in to access full features.
            </p>
          </div>
        )}
        
        {/* Action buttons - mobile optimized */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowQRDialog(true)}>
            <QrCode className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">QR Code</span>
          </Button>
          {isManager && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowCheckDialog(true)}>
                <ClipboardCheck className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Log Check</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowMaintenanceDialog(true)}>
                <Wrench className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Maintenance</span>
              </Button>
              <Button size="sm" onClick={() => navigate(`/equipment/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </>
          )}
        </div>

        {/* Equipment Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold">{equipment.name}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {equipment.locations?.name}
            {equipment.locations?.city && ` • ${equipment.locations.city}`}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Equipment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Model / Type</p>
                <p className="font-medium">{equipment.model_type || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Power Supply Type</p>
                <p className="font-medium">{equipment.power_supply_type || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Power Consumption</p>
                <p className="font-medium">{equipment.power_consumption || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date Added</p>
                <p className="font-medium">{format(new Date(equipment.date_added), "MMMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Check Date</p>
                <p className="font-medium">
                  {equipment.last_check_date ? format(new Date(equipment.last_check_date), "MMMM d, yyyy") : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Check Date</p>
                <p className="font-medium">
                  {equipment.next_check_date ? format(new Date(equipment.next_check_date), "MMMM d, yyyy") : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <EquipmentRiskBadge
                  lastCheckDate={equipment.last_check_date}
                  nextCheckDate={equipment.next_check_date}
                  status={equipment.status}
                />
              </div>
            </div>

            {equipment.last_check_notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Check Notes</p>
                <p className="text-sm bg-muted p-3 rounded">{equipment.last_check_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {documents && documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                "How to Use" Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-muted rounded hover:bg-muted/70 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{doc.file_name}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              History & Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="interventions">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="interventions">Interventions</TabsTrigger>
                <TabsTrigger value="checks">Checks</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="status">Status History</TabsTrigger>
              </TabsList>

              <TabsContent value="interventions">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Next Check</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!user ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Sign in to view intervention history
                          </TableCell>
                        </TableRow>
                      ) : !interventions || interventions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No interventions recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        interventions.map((intervention) => (
                          <TableRow
                            key={intervention.id}
                            className={isManager ? "cursor-pointer hover:bg-muted/50" : ""}
                            onClick={isManager ? () => navigate(`/interventions/${intervention.id}`) : undefined}
                          >
                            <TableCell>
                              {format(new Date(intervention.scheduled_for), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>{intervention.title}</TableCell>
                            <TableCell>
                              {intervention.performed_by?.full_name || intervention.performed_by?.email}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  intervention.status === "completed"
                                    ? "default"
                                    : intervention.status === "overdue"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {intervention.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {intervention.next_check_date
                                ? format(new Date(intervention.next_check_date), "MMM d, yyyy")
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="checks">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Check Date</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!checks || checks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No checks logged yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        checks.map((check) => (
                          <TableRow key={check.id}>
                            <TableCell>{format(new Date(check.check_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              <Badge variant={
                                check.result_status === "passed" ? "default" :
                                check.result_status === "failed" ? "destructive" :
                                "secondary"
                              }>
                                {check.result_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md truncate">{check.notes || "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="maintenance">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Technician</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!maintenanceEvents || maintenanceEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No maintenance events logged yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        maintenanceEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>{format(new Date(event.event_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{event.technician}</TableCell>
                            <TableCell className="max-w-md truncate">{event.description}</TableCell>
                            <TableCell>{event.cost ? `$${event.cost.toFixed(2)}` : "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="status">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!statusHistory || statusHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No status changes recorded.
                          </TableCell>
                        </TableRow>
                      ) : (
                        statusHistory.map((history) => (
                          <TableRow key={history.id}>
                            <TableCell>{format(new Date(history.changed_at), "MMM d, yyyy p")}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{history.old_status || "N/A"}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge>{history.new_status}</Badge>
                            </TableCell>
                            <TableCell className="max-w-md truncate">{history.notes || "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {isManager && (
          <>
            <ScheduleInterventionDialog
              open={showScheduleDialog}
              onOpenChange={setShowScheduleDialog}
              equipmentId={id!}
              equipmentName={equipment.name}
              locationId={equipment.location_id}
            />
            <EquipmentCheckDialog
              open={showCheckDialog}
              onOpenChange={setShowCheckDialog}
              equipmentId={id!}
            />
            <MaintenanceEventDialog
              open={showMaintenanceDialog}
              onOpenChange={setShowMaintenanceDialog}
              equipmentId={id!}
            />
          </>
        )}

        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Equipment QR Code</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  id="equipment-qr-code"
                  value={equipmentUrl}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">{equipment.name}</p>
                <p className="text-xs text-muted-foreground">
                  Scan to view equipment details
                </p>
              </div>
              <Button onClick={downloadQRCode} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download QR Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
