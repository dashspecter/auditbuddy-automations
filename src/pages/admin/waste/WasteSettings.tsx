import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Trash2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useWasteThresholds, useCreateWasteThreshold, useDeleteWasteThreshold, WasteThreshold } from "@/hooks/useWaste";
import { useWasteProducts } from "@/hooks/useWaste";
import { useLocations } from "@/hooks/useLocations";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";
import { useSmartBack } from "@/hooks/useSmartBack";

export default function WasteSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useSmartBack({ adminFallback: "/admin/waste/entries" });
  
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: thresholds, isLoading } = useWasteThresholds();
  const { data: products } = useWasteProducts();
  const { data: locations } = useLocations();
  const createThreshold = useCreateWasteThreshold();
  const deleteThreshold = useDeleteWasteThreshold();

  const [formData, setFormData] = useState({
    location_id: "",
    category: "",
    waste_product_id: "",
    threshold_type: "daily_cost" as 'daily_cost' | 'daily_weight_g',
    threshold_value: 0,
    active: true,
  });

  // Get unique categories from products
  const categories = [...new Set(products?.map(p => p.category).filter(Boolean))];

  const handleOpenDialog = () => {
    setFormData({
      location_id: "",
      category: "",
      waste_product_id: "",
      threshold_type: "daily_cost",
      threshold_value: 0,
      active: true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    await createThreshold.mutateAsync({
      location_id: formData.location_id || null,
      category: formData.category || null,
      waste_product_id: formData.waste_product_id || null,
      threshold_type: formData.threshold_type,
      threshold_value: formData.threshold_value,
      active: formData.active,
    });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this threshold?")) {
      await deleteThreshold.mutateAsync(id);
    }
  };

  const getThresholdScope = (threshold: WasteThreshold) => {
    const parts = [];
    if (threshold.location_id) {
      const loc = locations?.find(l => l.id === threshold.location_id);
      parts.push(loc?.name || "Location");
    }
    if (threshold.category) {
      parts.push(threshold.category);
    }
    if (threshold.waste_product_id) {
      const prod = products?.find(p => p.id === threshold.waste_product_id);
      parts.push(prod?.name || "Product");
    }
    return parts.length > 0 ? parts.join(" / ") : "All";
  };

  return (
    <ModuleGate module="wastage">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Waste Settings</h1>
              <p className="text-muted-foreground mt-1">
                Configure thresholds and alerts for waste monitoring
              </p>
            </div>
          </div>
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Threshold
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Waste Thresholds
            </CardTitle>
            <CardDescription>
              Set limits to get alerts when waste exceeds acceptable levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : thresholds?.length === 0 ? (
              <EmptyState
                icon={Settings}
                title="No thresholds configured"
                description="Add thresholds to get alerts when waste exceeds limits"
                action={{
                  label: "Add Threshold",
                  onClick: handleOpenDialog
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scope</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Threshold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thresholds?.map((threshold) => (
                      <TableRow key={threshold.id}>
                        <TableCell className="font-medium">
                          {getThresholdScope(threshold)}
                        </TableCell>
                        <TableCell>
                          {threshold.threshold_type === 'daily_cost' ? 'Daily Cost' : 'Daily Weight'}
                        </TableCell>
                        <TableCell className="text-right">
                          {threshold.threshold_type === 'daily_cost' 
                            ? `${threshold.threshold_value.toFixed(2)} RON`
                            : `${threshold.threshold_value.toFixed(0)} g`
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={threshold.active ? "default" : "secondary"}>
                            {threshold.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(threshold.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Threshold Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Threshold</DialogTitle>
              <DialogDescription>
                Configure a new waste threshold for monitoring
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(v) => setFormData({ ...formData, location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All locations</SelectItem>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (optional)</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Product (optional)</Label>
                <Select
                  value={formData.waste_product_id}
                  onValueChange={(v) => setFormData({ ...formData, waste_product_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All products</SelectItem>
                    {products?.map((prod) => (
                      <SelectItem key={prod.id} value={prod.id}>{prod.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold_type">Threshold Type</Label>
                <Select
                  value={formData.threshold_type}
                  onValueChange={(v) => setFormData({ ...formData, threshold_type: v as 'daily_cost' | 'daily_weight_g' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_cost">Daily Cost (RON)</SelectItem>
                    <SelectItem value="daily_weight_g">Daily Weight (grams)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold_value">
                  Threshold Value ({formData.threshold_type === 'daily_cost' ? 'RON' : 'grams'})
                </Label>
                <Input
                  id="threshold_value"
                  type="number"
                  step={formData.threshold_type === 'daily_cost' ? "0.01" : "1"}
                  min="0"
                  value={formData.threshold_value}
                  onChange={(e) => setFormData({ ...formData, threshold_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={formData.threshold_value <= 0 || createThreshold.isPending}
              >
                {createThreshold.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGate>
  );
}
