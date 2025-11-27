import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, Calendar, FileText, Wrench } from "lucide-react";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEquipmentById } from "@/hooks/useEquipment";
import { useEquipmentDocuments } from "@/hooks/useEquipmentDocuments";
import { useEquipmentInterventions } from "@/hooks/useEquipmentInterventions";
import { ScheduleInterventionDialog } from "@/components/ScheduleInterventionDialog";

export default function EquipmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const { data: equipment, isLoading } = useEquipmentById(id || "");
  const { data: documents } = useEquipmentDocuments(id || "");
  const { data: interventions } = useEquipmentInterventions(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4 md:p-6">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4 md:p-6">
          <p className="text-center text-muted-foreground">Equipment not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/equipment")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Equipment List
          </Button>
          <Button onClick={() => navigate(`/equipment/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Equipment
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">{equipment.name}</h1>
          <p className="text-muted-foreground">
            {equipment.locations?.name}
            {equipment.locations?.city && ` - ${equipment.locations.city}`}
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
                <Badge variant={
                  equipment.status === "active" ? "default" : 
                  equipment.status === "transferred" ? "outline" : 
                  "secondary"
                }>
                  {equipment.status}
                </Badge>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Interventions & Checks History
            </CardTitle>
            <Button onClick={() => setShowScheduleDialog(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Next Check
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Supervised By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!interventions || interventions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No interventions recorded yet. Schedule the first check to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    interventions.map((intervention) => (
                      <TableRow
                        key={intervention.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/interventions/${intervention.id}`)}
                      >
                        <TableCell>
                          {format(new Date(intervention.scheduled_for), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{intervention.title}</TableCell>
                        <TableCell>
                          {intervention.performed_by?.full_name || intervention.performed_by?.email}
                        </TableCell>
                        <TableCell>
                          {intervention.supervised_by
                            ? intervention.supervised_by.full_name || intervention.supervised_by.email
                            : "-"}
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
          </CardContent>
        </Card>
      </main>

      <ScheduleInterventionDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        equipmentId={id!}
        equipmentName={equipment.name}
        locationId={equipment.location_id}
      />
    </div>
  );
}
