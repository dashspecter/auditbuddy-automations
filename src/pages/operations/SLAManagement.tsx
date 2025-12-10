import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSLAConfigs, useCreateSLAConfig, useUpdateSLAConfig, useDeleteSLAConfig, SLARule } from "@/hooks/useOperationsAgent";
import { useLocations } from "@/hooks/useLocations";
import { Plus, Edit, Trash2, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const METRIC_OPTIONS = [
  { value: "equipment_uptime", label: "Equipment Uptime %" },
  { value: "overdue_maintenance", label: "Overdue Maintenance Count" },
  { value: "issue_count", label: "Issue Count" },
  { value: "checklist_completion", label: "Checklist Completion %" },
];

const OPERATOR_OPTIONS = [
  { value: ">", label: "Greater than" },
  { value: "<", label: "Less than" },
  { value: ">=", label: "Greater or equal" },
  { value: "<=", label: "Less or equal" },
  { value: "=", label: "Equal to" },
];

const ACTION_OPTIONS = [
  { value: "alert", label: "Create Alert" },
  { value: "create_maintenance_task", label: "Create Maintenance Task" },
  { value: "notify_manager", label: "Notify Manager" },
];

export default function SLAManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sla_name: "",
    description: "",
    location_id: "",
    active: true,
    rules_json: [{ metric: "", operator: "<", threshold: 0, action: "alert" }] as SLARule[],
  });

  const { data: locations } = useLocations();
  const { data: slaConfigs, isLoading, refetch } = useSLAConfigs();
  const createSLA = useCreateSLAConfig();
  const updateSLA = useUpdateSLAConfig();
  const deleteSLA = useDeleteSLAConfig();

  const resetForm = () => {
    setFormData({
      sla_name: "",
      description: "",
      location_id: "",
      active: true,
      rules_json: [{ metric: "", operator: "<", threshold: 0, action: "alert" }],
    });
    setEditingId(null);
  };

  const handleEdit = (sla: any) => {
    setFormData({
      sla_name: sla.sla_name,
      description: sla.description || "",
      location_id: sla.location_id || "",
      active: sla.active,
      rules_json: sla.rules_json || [{ metric: "", operator: "<", threshold: 0, action: "alert" }],
    });
    setEditingId(sla.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SLA?")) return;
    
    try {
      await deleteSLA.mutateAsync(id);
      toast.success("SLA deleted");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete SLA");
    }
  };

  const handleSubmit = async () => {
    if (!formData.sla_name || formData.rules_json.length === 0) {
      toast.error("Please fill in required fields");
      return;
    }

    const validRules = formData.rules_json.filter(r => r.metric);
    if (validRules.length === 0) {
      toast.error("Please add at least one rule");
      return;
    }

    try {
      if (editingId) {
        await updateSLA.mutateAsync({
          id: editingId,
          sla_name: formData.sla_name,
          description: formData.description || null,
          location_id: formData.location_id || null,
          active: formData.active,
          rules_json: validRules as any,
        });
        toast.success("SLA updated");
      } else {
        await createSLA.mutateAsync({
          sla_name: formData.sla_name,
          description: formData.description || null,
          location_id: formData.location_id || null,
          active: formData.active,
          rules_json: validRules as any,
        });
        toast.success("SLA created");
      }
      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save SLA");
    }
  };

  const addRule = () => {
    setFormData({
      ...formData,
      rules_json: [...formData.rules_json, { metric: "", operator: "<", threshold: 0, action: "alert" }],
    });
  };

  const updateRule = (index: number, field: keyof SLARule, value: any) => {
    const newRules = [...formData.rules_json];
    newRules[index] = { ...newRules[index], [field]: value };
    setFormData({ ...formData, rules_json: newRules });
  };

  const removeRule = (index: number) => {
    setFormData({
      ...formData,
      rules_json: formData.rules_json.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SLA Management</h1>
          <p className="text-muted-foreground">Configure Service Level Agreements for locations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New SLA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit SLA" : "Create SLA"}</DialogTitle>
              <DialogDescription>Define rules that the Operations Agent will monitor</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SLA Name *</Label>
                  <Input
                    value={formData.sla_name}
                    onChange={(e) => setFormData({ ...formData, sla_name: e.target.value })}
                    placeholder="e.g., Equipment Uptime SLA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location (optional)</Label>
                  <Select value={formData.location_id || "all"} onValueChange={(v) => setFormData({ ...formData, location_id: v === "all" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations?.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this SLA..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label>Active</Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Rules</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRule}>
                    <Plus className="h-3 w-3 mr-1" /> Add Rule
                  </Button>
                </div>
                {formData.rules_json.map((rule, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                    <Select value={rule.metric} onValueChange={(v) => updateRule(index, "metric", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Metric" />
                      </SelectTrigger>
                      <SelectContent>
                        {METRIC_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={rule.operator} onValueChange={(v) => updateRule(index, "operator", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Op" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATOR_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={rule.threshold}
                      onChange={(e) => updateRule(index, "threshold", parseFloat(e.target.value))}
                      placeholder="Value"
                    />
                    <Select value={rule.action} onValueChange={(v) => updateRule(index, "action", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRule(index)}
                      disabled={formData.rules_json.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createSLA.isPending || updateSLA.isPending}>
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SLA Configurations</CardTitle>
          <CardDescription>Service Level Agreements monitored by the Operations Agent</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : slaConfigs && slaConfigs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SLA Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaConfigs.map((sla) => (
                  <TableRow key={sla.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{sla.sla_name}</span>
                          {sla.description && (
                            <p className="text-xs text-muted-foreground">{sla.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{sla.location?.name || "All Locations"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{(sla.rules_json as SLARule[])?.length || 0} rules</Badge>
                    </TableCell>
                    <TableCell>
                      {sla.active ? (
                        <Badge className="bg-green-500/10 text-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(sla)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sla.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No SLAs configured</p>
              <p className="text-sm text-muted-foreground">Create an SLA to start monitoring operations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
