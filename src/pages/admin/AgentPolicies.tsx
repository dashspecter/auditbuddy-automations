import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAgentPolicies, useCreateAgentPolicy, useUpdateAgentPolicy, useDeleteAgentPolicy, AGENT_TYPES, AgentPolicy } from "@/hooks/useAgents";
import { format } from "date-fns";

const OPERATORS = [
  { value: ">", label: "Greater than (>)" },
  { value: "<", label: "Less than (<)" },
  { value: "=", label: "Equals (=)" },
  { value: ">=", label: "Greater or equal (>=)" },
  { value: "<=", label: "Less or equal (<=)" },
  { value: "!=", label: "Not equals (!=)" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not contains" },
];

interface PolicyFormData {
  agent_type: string;
  policy_name: string;
  description: string;
  conditions_json: Array<{ field: string; operator: string; value: string }>;
  actions_json: Array<{ action: string; params?: Record<string, unknown> }>;
  active: boolean;
}

const emptyForm: PolicyFormData = {
  agent_type: "",
  policy_name: "",
  description: "",
  conditions_json: [{ field: "", operator: "=", value: "" }],
  actions_json: [{ action: "" }],
  active: true,
};

const AgentPolicies = () => {
  const navigate = useNavigate();
  const [selectedAgentType, setSelectedAgentType] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AgentPolicy | null>(null);
  const [formData, setFormData] = useState<PolicyFormData>(emptyForm);

  const { data: policies = [], isLoading } = useAgentPolicies(selectedAgentType || undefined);
  const createPolicy = useCreateAgentPolicy();
  const updatePolicy = useUpdateAgentPolicy();
  const deletePolicy = useDeleteAgentPolicy();

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (policy: AgentPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      agent_type: policy.agent_type,
      policy_name: policy.policy_name,
      description: policy.description || "",
      conditions_json: policy.conditions_json?.length > 0 
        ? policy.conditions_json.map(c => ({ ...c, value: String(c.value) }))
        : [{ field: "", operator: "=", value: "" }],
      actions_json: policy.actions_json?.length > 0 
        ? policy.actions_json 
        : [{ action: "" }],
      active: policy.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const conditions = formData.conditions_json
      .filter(c => c.field && c.value)
      .map(c => ({
        field: c.field,
        operator: c.operator as ">" | "<" | "=" | ">=" | "<=" | "!=" | "contains" | "not_contains",
        value: c.value as unknown,
      }));

    const actions = formData.actions_json.filter(a => a.action);

    const payload = {
      agent_type: formData.agent_type,
      policy_name: formData.policy_name,
      description: formData.description,
      conditions_json: conditions,
      actions_json: actions,
      active: formData.active,
    };

    if (editingPolicy) {
      await updatePolicy.mutateAsync({ id: editingPolicy.id, ...payload });
    } else {
      await createPolicy.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this policy?")) {
      await deletePolicy.mutateAsync(id);
    }
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions_json: [...formData.conditions_json, { field: "", operator: "=", value: "" }],
    });
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions_json: formData.conditions_json.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, field: string, value: string) => {
    const updated = [...formData.conditions_json];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, conditions_json: updated });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions_json: [...formData.actions_json, { action: "" }],
    });
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions_json: formData.actions_json.filter((_, i) => i !== index),
    });
  };

  const updateAction = (index: number, value: string) => {
    const updated = [...formData.actions_json];
    updated[index] = { action: value };
    setFormData({ ...formData, actions_json: updated });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Agent Policies
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure rules and actions for autonomous agents
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Policy
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-64">
              <Label>Agent Type</Label>
              <Select value={selectedAgentType} onValueChange={setSelectedAgentType}>
                <SelectTrigger>
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All agents</SelectItem>
                  {AGENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
          <CardDescription>
            {policies.length} {policies.length === 1 ? "policy" : "policies"} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : policies.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No policies configured yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Name</TableHead>
                  <TableHead>Agent Type</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.policy_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{policy.agent_type}</Badge>
                    </TableCell>
                    <TableCell>{policy.conditions_json?.length || 0} rules</TableCell>
                    <TableCell>{policy.actions_json?.length || 0} actions</TableCell>
                    <TableCell>
                      <Badge variant={policy.active ? "default" : "secondary"}>
                        {policy.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(policy.updated_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(policy)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(policy.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Policy Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? "Edit Policy" : "Create New Policy"}</DialogTitle>
            <DialogDescription>
              Define conditions and actions for the agent policy
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Agent Type</Label>
                <Select
                  value={formData.agent_type}
                  onValueChange={(value) => setFormData({ ...formData, agent_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Policy Name</Label>
                <Input
                  value={formData.policy_name}
                  onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                  placeholder="e.g., High Priority Alert"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this policy does..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Conditions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="h-4 w-4 mr-1" /> Add Condition
                </Button>
              </div>
              <div className="space-y-2">
                {formData.conditions_json.map((condition, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Field name"
                      value={condition.field}
                      onChange={(e) => updateCondition(index, "field", e.target.value)}
                      className="flex-1"
                    />
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(index, "operator", value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, "value", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(index)}
                      disabled={formData.conditions_json.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Actions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAction}>
                  <Plus className="h-4 w-4 mr-1" /> Add Action
                </Button>
              </div>
              <div className="space-y-2">
                {formData.actions_json.map((action, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Action name (e.g., send_alert, create_task)"
                      value={action.action}
                      onChange={(e) => updateAction(index, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAction(index)}
                      disabled={formData.actions_json.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label>Policy Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.agent_type || !formData.policy_name || createPolicy.isPending || updatePolicy.isPending}
            >
              {editingPolicy ? "Save Changes" : "Create Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentPolicies;
