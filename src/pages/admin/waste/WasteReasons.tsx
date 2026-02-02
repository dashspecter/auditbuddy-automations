import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, AlertCircle, ArrowLeft } from "lucide-react";
import { useWasteReasons, useCreateWasteReason, useUpdateWasteReason, WasteReason } from "@/hooks/useWaste";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";
import { useSmartBack } from "@/hooks/useSmartBack";

export default function WasteReasons() {
  const { t } = useTranslation();
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<WasteReason | null>(null);

  const { data: reasons, isLoading } = useWasteReasons(!showInactive);
  const createReason = useCreateWasteReason();
  const updateReason = useUpdateWasteReason();

  const [formData, setFormData] = useState({
    name: "",
    sort_order: 0,
    active: true,
  });

  const handleOpenDialog = (reason?: WasteReason) => {
    if (reason) {
      setEditingReason(reason);
      setFormData({
        name: reason.name,
        sort_order: reason.sort_order,
        active: reason.active,
      });
    } else {
      setEditingReason(null);
      const maxOrder = reasons?.reduce((max, r) => Math.max(max, r.sort_order), 0) || 0;
      setFormData({
        name: "",
        sort_order: maxOrder + 1,
        active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingReason) {
      await updateReason.mutateAsync({
        id: editingReason.id,
        ...formData,
      });
    } else {
      await createReason.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const defaultReasons = [
    "Prep Error",
    "Expired",
    "Overcooked",
    "Returned by Customer",
    "Spilled",
    "Equipment Failure",
    "Quality Issue",
    "Over-production",
  ];

  const handleAddDefaults = async () => {
    for (let i = 0; i < defaultReasons.length; i++) {
      await createReason.mutateAsync({
        name: defaultReasons[i],
        sort_order: i + 1,
        active: true,
      });
    }
  };

  return (
    <ModuleGate module="wastage">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Waste Reasons</h1>
            <p className="text-muted-foreground mt-1">
              Configure reasons for waste to help with analysis
            </p>
          </div>
          <div className="flex gap-2">
            {reasons?.length === 0 && (
              <Button 
                variant="outline" 
                onClick={handleAddDefaults}
                disabled={createReason.isPending}
              >
                Add Default Reasons
              </Button>
            )}
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Reason
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm">Show inactive</Label>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : reasons?.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="No waste reasons"
                description="Add reasons to categorize why waste occurred"
                action={{
                  label: "Add Reason",
                  onClick: () => handleOpenDialog()
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Order</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reasons?.map((reason) => (
                      <TableRow key={reason.id}>
                        <TableCell>
                          <span className="text-muted-foreground">{reason.sort_order}</span>
                        </TableCell>
                        <TableCell className="font-medium">{reason.name}</TableCell>
                        <TableCell>
                          <Badge variant={reason.active ? "default" : "secondary"}>
                            {reason.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(reason)}
                          >
                            <Pencil className="h-4 w-4" />
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

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingReason ? "Edit Reason" : "Add Reason"}</DialogTitle>
              <DialogDescription>
                {editingReason 
                  ? "Update the waste reason" 
                  : "Add a new reason for waste"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Reason Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Expired, Prep Error, Overcooked"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Display Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.name || createReason.isPending || updateReason.isPending}
              >
                {createReason.isPending || updateReason.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGate>
  );
}
