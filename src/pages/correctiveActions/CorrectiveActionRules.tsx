import { useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCorrectiveActionRules, useCreateCARule, useUpdateCARule, useDeleteCARule, type CorrectiveActionRule } from "@/hooks/useCorrectiveActions";
import { toast } from "sonner";

const TRIGGER_LABELS = {
  audit_fail: "Audit Failure",
  incident_repeat: "Incident Repeat",
  asset_downtime_pattern: "Asset Downtime Pattern",
};

const DEFAULT_CONFIGS = {
  audit_fail: `{
  "severity": "high",
  "due_hours": 24,
  "stop_the_line": false,
  "bundle": [
    { "title": "Immediate corrective action", "due_hours": 4, "evidence_required": true },
    { "title": "Root cause investigation", "due_hours": 24, "evidence_required": false }
  ]
}`,
  incident_repeat: `{
  "window_days": 14,
  "min_count": 2,
  "severity": "high",
  "requires_approval": true,
  "approval_role": "area_manager",
  "bundle": [
    { "title": "Supplier batch check", "due_hours": 24, "evidence_required": true },
    { "title": "Retraining session", "due_hours": 72, "evidence_required": false }
  ]
}`,
  asset_downtime_pattern: `{
  "window_days": 30,
  "min_count": 3,
  "severity": "medium",
  "due_hours": 72,
  "bundle": [
    { "title": "Schedule technician inspection", "due_hours": 24, "evidence_required": false },
    { "title": "Upload before/after photo", "due_hours": 72, "evidence_required": true }
  ]
}`,
};

export default function CorrectiveActionRules() {
  const { data: rules = [], isLoading } = useCorrectiveActionRules();
  const createRule = useCreateCARule();
  const updateRule = useUpdateCARule();
  const deleteRule = useDeleteCARule();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<CorrectiveActionRule["trigger_type"]>("audit_fail");
  const [configJson, setConfigJson] = useState(DEFAULT_CONFIGS.audit_fail);
  const [jsonError, setJsonError] = useState("");

  const handleCreate = async () => {
    try {
      const parsed = JSON.parse(configJson);
      setJsonError("");
      await createRule.mutateAsync({
        name,
        enabled: true,
        trigger_type: triggerType,
        trigger_config: parsed,
      });
      toast.success("Rule created.");
      setCreateOpen(false);
      setName("");
      setConfigJson(DEFAULT_CONFIGS.audit_fail);
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        setJsonError("Invalid JSON: " + err.message);
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to create rule.";
      toast.error(message);
    }
  };

  const handleToggle = async (rule: CorrectiveActionRule) => {
    try {
      await updateRule.mutateAsync({ id: rule.id, enabled: !rule.enabled });
      toast.success(rule.enabled ? "Rule disabled." : "Rule enabled.");
    } catch {
      toast.error("Failed to update rule.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule.mutateAsync(id);
      toast.success("Rule deleted.");
    } catch {
      toast.error("Failed to delete rule.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CA Auto-Generation Rules</h1>
          <p className="text-muted-foreground text-sm mt-1">Automatically create CAs from audit failures, incidents, and downtime patterns</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Rule
        </Button>
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))
      ) : rules.length === 0 ? (
        <Card className="p-12 text-center">
          <Settings2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground">No rules configured</p>
          <p className="text-muted-foreground text-sm mt-1">Create rules to automatically generate corrective actions from failures.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
              <CardContent className="pt-4 pb-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">{rule.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {TRIGGER_LABELS[rule.trigger_type]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={rule.enabled
                        ? "border-success/40 text-success bg-success/10 text-xs"
                        : "border-muted text-muted-foreground text-xs"}
                    >
                      {rule.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                    {JSON.stringify(rule.trigger_config).slice(0, 120)}...
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggle(rule)}
                    title={rule.enabled ? "Disable rule" : "Enable rule"}
                  >
                    {rule.enabled
                      ? <ToggleRight className="h-5 w-5 text-success" />
                      : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(rule.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Auto-Generation Rule</DialogTitle>
            <DialogDescription>Define when to automatically create a corrective action and what items to bundle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Food Safety Critical Fail" className="mt-1" />
            </div>
            <div>
              <Label>Trigger Type</Label>
              <Select
                value={triggerType}
                onValueChange={(v) => {
                  const t = v as CorrectiveActionRule["trigger_type"];
                  setTriggerType(t);
                  setConfigJson(DEFAULT_CONFIGS[t]);
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="audit_fail">Audit Failure</SelectItem>
                  <SelectItem value="incident_repeat">Incident Repeat</SelectItem>
                  <SelectItem value="asset_downtime_pattern">Asset Downtime Pattern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trigger Config (JSON)</Label>
              <Textarea
                value={configJson}
                onChange={e => { setConfigJson(e.target.value); setJsonError(""); }}
                rows={10}
                className="mt-1 font-mono text-xs"
              />
              {jsonError && <p className="text-xs text-destructive mt-1">{jsonError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createRule.isPending || !name.trim()}>
              {createRule.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
