import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  useApprovalWorkflows,
  useCreateWorkflow,
  useUpdateWorkflow,
  ApprovalWorkflow,
  ApprovalWorkflowStep,
} from "@/hooks/useApprovals";
import { Plus, Trash2, GripVertical, Loader2, Landmark, Pencil } from "lucide-react";

const ENTITY_TYPES = [
  { value: "general", label: "General" },
  { value: "task", label: "Task" },
  { value: "document", label: "Document" },
  { value: "purchase_request", label: "Purchase Request" },
  { value: "leave_request", label: "Leave Request" },
  { value: "budget", label: "Budget" },
];

const ROLE_OPTIONS = [
  { value: "clerk", label: "Clerk" },
  { value: "department_head", label: "Department Head" },
  { value: "secretary_general", label: "Secretary General" },
  { value: "mayor", label: "Mayor" },
  { value: "company_admin", label: "Admin" },
  { value: "company_owner", label: "Owner" },
];

export default function ApprovalWorkflows() {
  const { data: workflows = [], isLoading } = useApprovalWorkflows();
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entityType, setEntityType] = useState("general");
  const [steps, setSteps] = useState<ApprovalWorkflowStep[]>([
    { step_order: 1, role: "department_head", label: "Department Head Review" },
  ]);
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setName("");
    setDescription("");
    setEntityType("general");
    setSteps([{ step_order: 1, role: "department_head", label: "Department Head Review" }]);
    setIsActive(true);
    setEditingWorkflow(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (workflow: ApprovalWorkflow) => {
    setEditingWorkflow(workflow);
    setName(workflow.name);
    setDescription(workflow.description || "");
    setEntityType(workflow.entity_type);
    const parsedSteps = typeof workflow.steps === 'string' ? JSON.parse(workflow.steps) : workflow.steps;
    setSteps(parsedSteps);
    setIsActive(workflow.is_active);
    setIsDialogOpen(true);
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        step_order: prev.length + 1,
        role: "company_admin",
        label: `Step ${prev.length + 1}`,
      },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, step_order: i + 1 }))
    );
  };

  const updateStep = (index: number, field: keyof ApprovalWorkflowStep, value: string | number) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || steps.length === 0) return;

    if (editingWorkflow) {
      await updateWorkflow.mutateAsync({
        id: editingWorkflow.id,
        name,
        description,
        entity_type: entityType,
        steps,
        is_active: isActive,
      });
    } else {
      await createWorkflow.mutateAsync({
        name,
        description,
        entity_type: entityType,
        steps,
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const isSaving = createWorkflow.isPending || updateWorkflow.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Approval Workflows</h1>
          <p className="text-muted-foreground">
            Define multi-step approval processes for your institution.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No workflows yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first approval workflow to get started.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => {
            const parsedSteps = typeof workflow.steps === 'string'
              ? JSON.parse(workflow.steps)
              : workflow.steps;

            return (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        {!workflow.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      {workflow.description && (
                        <CardDescription className="mt-1">
                          {workflow.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(workflow)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="capitalize">
                      {workflow.entity_type.replace("_", " ")}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {parsedSteps.length} step{parsedSteps.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {parsedSteps.map((step: ApprovalWorkflowStep, idx: number) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {step.label}
                        </Badge>
                        {idx < parsedSteps.length - 1 && (
                          <span className="text-muted-foreground text-xs">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? "Edit Workflow" : "Create Workflow"}
            </DialogTitle>
            <DialogDescription>
              Define the approval steps and configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Workflow Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Document Approval"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this workflow is for..."
              />
            </div>

            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingWorkflow && (
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Approval Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Step
                </Button>
              </div>

              {steps.map((step, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex items-center text-muted-foreground mt-2">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-xs font-mono w-4">{index + 1}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={step.label}
                        onChange={(e) => updateStep(index, "label", e.target.value)}
                        placeholder="Step label"
                        className="h-8 text-sm"
                      />
                      <Select
                        value={step.role}
                        onValueChange={(val) => updateStep(index, "role", val)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {steps.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 mt-1"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || steps.length === 0 || isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingWorkflow ? "Save Changes" : "Create Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
