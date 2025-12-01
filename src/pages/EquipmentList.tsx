import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, QrCode, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEquipment } from "@/hooks/useEquipment";
import { EquipmentListTable } from "@/components/equipment/EquipmentListTable";

export default function EquipmentList() {
  const navigate = useNavigate();
  const { data: equipment } = useEquipment();

  const overdueCount = equipment?.filter(e => 
    e.next_check_date && new Date(e.next_check_date) < new Date()
  ).length || 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Equipment Management</h1>
            <p className="text-muted-foreground">Track and maintain your equipment</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/equipment/bulk-qr")}>
              <QrCode className="mr-2 h-4 w-4" />
              Print QR Labels
            </Button>
            <Button onClick={() => navigate("/equipment/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{equipment?.length || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {equipment?.filter(e => e.status === "active").length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive flex items-center gap-2">
                {overdueCount > 0 && <AlertTriangle className="h-5 w-5" />}
                {overdueCount}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {equipment?.filter(e => e.status === "maintenance").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Equipment Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentListTable />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
