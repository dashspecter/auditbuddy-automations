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

// Predefined condition fields per agent type
const CONDITION_FIELDS: Record<string, Array<{ value: string; label: string; description: string }>> = {
  operations: [
    { value: "late_minutes", label: "Late Minutes", description: "Minutes employee is late to clock in" },
    { value: "inventory_level", label: "Inventory Level", description: "Current stock level of an item" },
    { value: "audit_score", label: "Audit Score", description: "Score from completed audit (0-100)" },
    { value: "equipment_status", label: "Equipment Status", description: "Status of equipment (operational, needs_maintenance, etc.)" },
    { value: "task_priority", label: "Task Priority", description: "Priority level of a task (low, medium, high, urgent)" },
    { value: "temperature", label: "Temperature", description: "Recorded temperature reading" },
  ],
  workforce: [
    { value: "overtime_hours", label: "Overtime Hours", description: "Weekly overtime hours worked" },
    { value: "consecutive_days", label: "Consecutive Days", description: "Days worked in a row without break" },
    { value: "shift_coverage", label: "Shift Coverage", description: "Percentage of shift positions filled" },
    { value: "absence_count", label: "Absence Count", description: "Number of absences in period" },
    { value: "performance_score", label: "Performance Score", description: "Employee performance rating" },
    { value: "hours_this_week", label: "Hours This Week", description: "Total hours scheduled this week" },
  ],
  compliance: [
    { value: "audit_score", label: "Audit Score", description: "Compliance audit score (0-100)" },
    { value: "days_since_audit", label: "Days Since Audit", description: "Days since last compliance audit" },
    { value: "document_expiry_days", label: "Document Expiry Days", description: "Days until document expires" },
    { value: "training_completion", label: "Training Completion", description: "Training completion percentage" },
    { value: "violation_count", label: "Violation Count", description: "Number of violations recorded" },
  ],
  insights: [
    { value: "trend_direction", label: "Trend Direction", description: "Direction of metric trend (up, down, stable)" },
    { value: "anomaly_score", label: "Anomaly Score", description: "Deviation from normal pattern" },
    { value: "data_freshness_hours", label: "Data Freshness", description: "Hours since last data update" },
  ],
};

// Predefined actions per agent type
const ACTION_OPTIONS: Record<string, Array<{ value: string; label: string; description: string }>> = {
  operations: [
    { value: "send_alert", label: "Send Alert", description: "Send notification to managers" },
    { value: "create_task", label: "Create Task", description: "Auto-create a task for follow-up" },
    { value: "escalate", label: "Escalate Issue", description: "Escalate to higher management" },
    { value: "log_event", label: "Log Event", description: "Record event in activity log" },
    { value: "update_status", label: "Update Status", description: "Change equipment/item status" },
    { value: "schedule_intervention", label: "Schedule Intervention", description: "Create maintenance intervention" },
  ],
  workforce: [
    { value: "send_alert", label: "Send Alert", description: "Notify managers about workforce issue" },
    { value: "create_task", label: "Create Task", description: "Create HR-related task" },
    { value: "block_scheduling", label: "Block Scheduling", description: "Prevent further shift assignments" },
    { value: "notify_employee", label: "Notify Employee", description: "Send notification to employee" },
    { value: "request_approval", label: "Request Approval", description: "Trigger approval workflow" },
    { value: "adjust_schedule", label: "Adjust Schedule", description: "Suggest schedule modifications" },
  ],
  compliance: [
    { value: "send_alert", label: "Send Alert", description: "Alert about compliance issue" },
    { value: "create_task", label: "Create Task", description: "Create remediation task" },
    { value: "schedule_audit", label: "Schedule Audit", description: "Auto-schedule new audit" },
    { value: "flag_location", label: "Flag Location", description: "Mark location for review" },
    { value: "generate_report", label: "Generate Report", description: "Create compliance report" },
    { value: "suspend_operations", label: "Suspend Operations", description: "Trigger operational pause" },
  ],
  insights: [
    { value: "generate_summary", label: "Generate Summary", description: "Create AI insight summary" },
    { value: "send_report", label: "Send Report", description: "Email report to stakeholders" },
    { value: "trigger_analysis", label: "Trigger Analysis", description: "Run deeper data analysis" },
    { value: "create_recommendation", label: "Create Recommendation", description: "Generate action recommendations" },
  ],
};

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
              <Select value={selectedAgentType || "all"} onValueChange={(val) => setSelectedAgentType(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
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
                <div>
                  <Label>Conditions</Label>
                  <p className="text-xs text-muted-foreground">When these conditions are met, actions will trigger</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="h-4 w-4 mr-1" /> Add Condition
                </Button>
              </div>
              <div className="space-y-3">
                {formData.conditions_json.map((condition, index) => {
                  const availableFields = CONDITION_FIELDS[formData.agent_type] || [];
                  const selectedField = availableFields.find(f => f.value === condition.field);
                  
                  return (
                    <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Field</Label>
                          {formData.agent_type && availableFields.length > 0 ? (
                            <Select
                              value={condition.field}
                              onValueChange={(value) => updateCondition(index, "field", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field to monitor" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields.map((field) => (
                                  <SelectItem key={field.value} value={field.value}>
                                    <div className="flex flex-col">
                                      <span>{field.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="Select agent type first"
                              value={condition.field}
                              onChange={(e) => updateCondition(index, "field", e.target.value)}
                              disabled={!formData.agent_type}
                            />
                          )}
                        </div>
                        <div className="w-40">
                          <Label className="text-xs text-muted-foreground">Operator</Label>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => updateCondition(index, "operator", value)}
                          >
                            <SelectTrigger>
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
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Value</Label>
                          <Input
                            placeholder="Threshold value"
                            value={condition.value}
                            onChange={(e) => updateCondition(index, "value", e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-5"
                          onClick={() => removeCondition(index)}
                          disabled={formData.conditions_json.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {selectedField && (
                        <p className="text-xs text-muted-foreground pl-1">{selectedField.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label>Actions</Label>
                  <p className="text-xs text-muted-foreground">What happens when conditions are met</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAction}>
                  <Plus className="h-4 w-4 mr-1" /> Add Action
                </Button>
              </div>
              <div className="space-y-3">
                {formData.actions_json.map((action, index) => {
                  const availableActions = ACTION_OPTIONS[formData.agent_type] || [];
                  const selectedAction = availableActions.find(a => a.value === action.action);
                  
                  return (
                    <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Action Type</Label>
                          {formData.agent_type && availableActions.length > 0 ? (
                            <Select
                              value={action.action}
                              onValueChange={(value) => updateAction(index, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select action to perform" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableActions.map((act) => (
                                  <SelectItem key={act.value} value={act.value}>
                                    <div className="flex flex-col">
                                      <span>{act.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="Select agent type first"
                              value={action.action}
                              onChange={(e) => updateAction(index, e.target.value)}
                              disabled={!formData.agent_type}
                            />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-5"
                          onClick={() => removeAction(index)}
                          disabled={formData.actions_json.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {selectedAction && (
                        <p className="text-xs text-muted-foreground pl-1">{selectedAction.description}</p>
                      )}
                    </div>
                  );
                })}
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
