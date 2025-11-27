import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Edit, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationSelector } from "@/components/LocationSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEquipment, useUpdateEquipment } from "@/hooks/useEquipment";
import { format } from "date-fns";

export default function EquipmentList() {
  const navigate = useNavigate();
  const [locationId, setLocationId] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const { data: equipment, isLoading } = useEquipment(locationId, statusFilter);
  const updateEquipment = useUpdateEquipment();

  const handleDeactivate = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await updateEquipment.mutateAsync({ id, status: newStatus });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Equipment List</h1>
            <p className="text-muted-foreground">Manage equipment across locations</p>
          </div>
          <Button onClick={() => navigate("/equipment/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <LocationSelector
                  value={locationId}
                  onValueChange={setLocationId}
                  allowAll
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Model/Type</TableHead>
                    <TableHead>Power Supply</TableHead>
                    <TableHead>Power Consumption</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Last Check</TableHead>
                    <TableHead>Next Check</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : equipment?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No equipment found. Add your first equipment to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    equipment?.map((item) => (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/equipment/${item.id}`)}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {item.locations?.name}
                          {item.locations?.city && ` - ${item.locations.city}`}
                        </TableCell>
                        <TableCell>{item.model_type || "-"}</TableCell>
                        <TableCell>{item.power_supply_type || "-"}</TableCell>
                        <TableCell>{item.power_consumption || "-"}</TableCell>
                        <TableCell>{format(new Date(item.date_added), "MMM d, yyyy")}</TableCell>
                        <TableCell>{item.last_check_date ? format(new Date(item.last_check_date), "MMM d, yyyy") : "-"}</TableCell>
                        <TableCell>{item.next_check_date ? format(new Date(item.next_check_date), "MMM d, yyyy") : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={
                            item.status === "active" ? "default" : 
                            item.status === "transferred" ? "outline" : 
                            "secondary"
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/equipment/${item.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/equipment/${item.id}/edit`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(item.id, item.status)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
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
    </div>
  );
}
