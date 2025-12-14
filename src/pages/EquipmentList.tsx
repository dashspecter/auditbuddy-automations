import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, QrCode, AlertTriangle, Wrench, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEquipment } from "@/hooks/useEquipment";
import { EquipmentListTable } from "@/components/equipment/EquipmentListTable";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";

const equipmentSubItems = [
  { title: "All Equipment", url: "/equipment", icon: Wrench, description: "View equipment" },
  { title: "Calendar", url: "/maintenance-calendar", icon: Calendar, description: "Maintenance calendar" },
  { title: "Recurring", url: "/recurring-maintenance", icon: RefreshCw, description: "Recurring schedules" },
  { title: "QR Codes", url: "/equipment/bulk-qr", icon: QrCode, description: "Bulk QR codes" },
];

export default function EquipmentList() {
  const navigate = useNavigate();
  const { data: equipment, isLoading } = useEquipment();

  const overdueCount = equipment?.filter(e => 
    e.next_check_date && new Date(e.next_check_date) < new Date()
  ).length || 0;

  const equipmentCount = equipment?.length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading equipment...</p>
          </div>
        </div>
    );
  }

  return (
    <ModuleGate module="equipment_management">
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-3xl font-bold">Equipment Management</h1>
              <p className="text-muted-foreground">Track and maintain your equipment</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {equipmentCount > 0 && (
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/equipment/bulk-qr")}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Print QR Labels
                </Button>
              )}
              <Button className="w-full sm:w-auto" onClick={() => navigate("/equipment/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
          </div>

          {/* Mobile-first quick navigation to subitems */}
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            {equipmentSubItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.url} to={item.url}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.title}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          </div>

          {equipmentCount === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No Equipment Yet"
              description="Start tracking your equipment by adding your first item. You can manage maintenance schedules, checks, and interventions from here."
              action={{
                label: "Add Equipment",
                onClick: () => navigate("/equipment/new")
              }}
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Equipment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{equipmentCount}</div>
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
            </>
          )}
        </div>
    </ModuleGate>
  );
}
