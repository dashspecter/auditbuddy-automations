import { useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Settings2, PlusCircle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { InfoTooltip } from "@/components/correctiveActions/InfoTooltip";
import { useCorrectiveActionRules, useCreateCARule, useUpdateCARule, useDeleteCARule, type CorrectiveActionRule } from "@/hooks/useCorrectiveActions";
import { toast } from "sonner";

const TRIGGER_LABELS: Record<CorrectiveActionRule["trigger_type"], string> = {
  audit_fail: "Audit Failure",
  incident_repeat: "Incident Repeat",
  asset_downtime_pattern: "Asset Downtime Pattern",
};

const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"] as const;
type Severity = typeof SEVERITY_OPTIONS[number];

const ROLE_OPTIONS = [
  { value: "store_manager", label: "Store Manager" },
  { value: "area_manager", label: "Area Manager" },
  { value: "company_admin", label: "Company Admin" },
  { value: "company_owner", label: "Company Owner" },
  { value: "shift_lead", label: "Shift Lead" },
  { value: "staff", label: "Staff" },
];

interface BundleItem {
  title: string;
  due_hours: number;
  evidence_required: boolean;
  assigned_role?: string;
}

interface AuditFailConfig {
  severity: Severity;
  due_hours: number;
  stop_the_line: boolean;
  bundle: BundleItem[];
}

interface IncidentRepeatConfig {
  window_days: number;
  min_count: number;
  severity: Severity;
  requires_approval: boolean;
  approval_role: string;
  bundle: BundleItem[];
}

interface AssetDowntimeConfig {
  window_days: number;
  min_count: number;
  severity: Severity;
  due_hours: number;
  bundle: BundleItem[];
}

const DEFAULT_AUDIT_FAIL: AuditFailConfig = {
  severity: "high",
  due_hours: 24,
  stop_the_line: false,
  bundle: [
    { title: "Immediate corrective action", due_hours: 4, evidence_required: true, assigned_role: "store_manager" },
    { title: "Root cause investigation", due_hours: 24, evidence_required: false, assigned_role: "area_manager" },
  ],
};

const DEFAULT_INCIDENT_REPEAT: IncidentRepeatConfig = {
  window_days: 14,
  min_count: 2,
  severity: "high",
  requires_approval: true,
  approval_role: "area_manager",
  bundle: [
    { title: "Supplier batch check", due_hours: 24, evidence_required: true, assigned_role: "store_manager" },
    { title: "Retraining session", due_hours: 72, evidence_required: false, assigned_role: "shift_lead" },
  ],
};

const DEFAULT_ASSET_DOWNTIME: AssetDowntimeConfig = {
  window_days: 30,
  min_count: 3,
  severity: "medium",
  due_hours: 72,
  bundle: [
    { title: "Schedule technician inspection", due_hours: 24, evidence_required: false, assigned_role: "store_manager" },
    { title: "Upload before/after photo", due_hours: 72, evidence_required: true, assigned_role: "store_manager" },
  ],
};

// ---- Bundle Items Editor ----
function BundleEditor({ items, onChange }: { items: BundleItem[]; onChange: (items: BundleItem[]) => void }) {
  const update = (index: number, patch: Partial<BundleItem>) => {
    onChange(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { title: "", due_hours: 24, evidence_required: false, assigned_role: "store_manager" }]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium">Action Items to Bundle</Label>
        <InfoTooltip
          content={
            <div className="space-y-1.5">
              <p className="font-semibold">Bundled Action Items</p>
              <p>These are the specific tasks that will be automatically created and assigned when this rule fires.</p>
              <p className="italic text-muted-foreground">Example: "Take fridge temperature reading (due in 4h, evidence required)" + "Submit incident report (due in 24h)"</p>
              <p>Each person assigned will see these as checklist items to complete before the CA can be closed.</p>
            </div>
          }
        />
      </div>
      <p className="text-xs text-muted-foreground -mt-1">Tasks automatically assigned when this rule triggers</p>
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0">#{index + 1}</span>
            <Input
              value={item.title}
              onChange={e => update(index, { title: e.target.value })}
              placeholder="e.g. Take temperature reading and log result"
              className="flex-1 h-8 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => remove(index)}
              disabled={items.length <= 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 pl-7">
            {/* Assigned Role */}
            <div className="flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={item.assigned_role ?? ""}
                onValueChange={v => update(index, { assigned_role: v || undefined })}
              >
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue placeholder="Assign to role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InfoTooltip
                side="right"
                content={
                  <div className="space-y-1">
                    <p className="font-semibold">Assigned Role</p>
                    <p>When this CA fires, the system looks up who holds this role at the affected location and automatically assigns them this task.</p>
                    <p className="italic text-muted-foreground">Example: "Store Manager" → the Store Manager at Store 3 gets this task in their queue.</p>
                  </div>
                }
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  value={item.due_hours}
                  onChange={e => update(index, { due_hours: Number(e.target.value) })}
                  className="w-16 h-7 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground">hours due</span>
                <InfoTooltip
                  side="right"
                  content="How many hours the assignee has to complete this specific task after the CA is created."
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={item.evidence_required}
                  onCheckedChange={v => update(index, { evidence_required: v })}
                  className="scale-75"
                />
                <span className="text-xs text-muted-foreground">Evidence required</span>
                <InfoTooltip
                  side="right"
                  content="The assignee must upload a photo or document proving the task is done before they can mark it complete."
                />
              </div>
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full h-8 text-xs">
        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
        Add Action Item
      </Button>
    </div>
  );
}

// ---- Audit Fail Form ----
function AuditFailForm({ config, onChange }: { config: AuditFailConfig; onChange: (c: AuditFailConfig) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Severity</Label>
            <InfoTooltip
              content={
                <div className="space-y-1.5">
                  <p className="font-semibold">CA Severity</p>
                  <p>Sets how urgent the CA is and defines the SLA deadline:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li><span className="font-medium text-foreground">Critical</span> — 4h, auto stop-the-line</li>
                    <li><span className="font-medium text-foreground">High</span> — 24h</li>
                    <li><span className="font-medium text-foreground">Medium</span> — 72h</li>
                    <li><span className="font-medium text-foreground">Low</span> — 7 days</li>
                  </ul>
                </div>
              }
            />
          </div>
          <Select value={config.severity} onValueChange={v => onChange({ ...config, severity: v as Severity })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Due within (hours)</Label>
            <InfoTooltip content="The CA must be fully resolved and closed within this many hours after being created. If not closed in time, it is marked overdue and escalated." />
          </div>
          <Input
            type="number" min={1}
            value={config.due_hours}
            onChange={e => onChange({ ...config, due_hours: Number(e.target.value) })}
            className="h-9"
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-destructive">Stop-the-Line</p>
            <InfoTooltip
              content={
                <div className="space-y-1.5">
                  <p className="font-semibold">Stop-the-Line 🚨</p>
                  <p>When enabled, the location is flagged as restricted and a red banner appears across the entire app for that location.</p>
                  <p>All operations at that location must halt until a manager or admin manually releases the restriction — with a recorded reason.</p>
                  <p className="italic text-muted-foreground">Example: A critical hygiene failure at Store 3 stops all operations there until the area manager confirms the issue is resolved.</p>
                </div>
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">Restrict location operations until manually released by a manager</p>
        </div>
        <Switch checked={config.stop_the_line} onCheckedChange={v => onChange({ ...config, stop_the_line: v })} />
      </div>
      <Separator />
      <BundleEditor items={config.bundle} onChange={bundle => onChange({ ...config, bundle })} />
    </div>
  );
}

// ---- Incident Repeat Form ----
function IncidentRepeatForm({ config, onChange }: { config: IncidentRepeatConfig; onChange: (c: IncidentRepeatConfig) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Window (days)</Label>
            <InfoTooltip
              content={
                <div className="space-y-1">
                  <p className="font-semibold">Detection Window</p>
                  <p>The system looks back this many days when counting incidents. Only incidents within this period count toward the threshold.</p>
                  <p className="italic text-muted-foreground">Example: Window = 14 days means if the same incident happens 2+ times in the last 2 weeks, the rule fires.</p>
                </div>
              }
            />
          </div>
          <Input type="number" min={1} value={config.window_days} onChange={e => onChange({ ...config, window_days: Number(e.target.value) })} className="h-9" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Min. incidents</Label>
            <InfoTooltip content="The minimum number of times the same incident must occur within the window before a CA is automatically created. Set to 2 to catch repeats, higher for patterns." />
          </div>
          <Input type="number" min={1} value={config.min_count} onChange={e => onChange({ ...config, min_count: Number(e.target.value) })} className="h-9" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Severity</Label>
            <InfoTooltip content="The severity level of the CA that gets created. Repeated incidents are usually High severity since they indicate a systemic issue." />
          </div>
          <Select value={config.severity} onValueChange={v => onChange({ ...config, severity: v as Severity })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">Requires Manager Approval</p>
            <InfoTooltip
              content={
                <div className="space-y-1">
                  <p className="font-semibold">Approval Gate</p>
                  <p>When enabled, a manager or admin must explicitly approve the CA before it can be marked closed — even after all action items are done.</p>
                  <p className="italic text-muted-foreground">Example: Retraining was completed but the Area Manager must sign off that the issue is genuinely resolved before the CA closes.</p>
                </div>
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">A manager must approve before the CA can be closed</p>
        </div>
        <Switch checked={config.requires_approval} onCheckedChange={v => onChange({ ...config, requires_approval: v })} />
      </div>
      {config.requires_approval && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Approval Role</Label>
            <InfoTooltip content="Which role level is allowed to approve and close this CA. Only users with this role or higher can sign it off." />
          </div>
          <Select value={config.approval_role} onValueChange={v => onChange({ ...config, approval_role: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="area_manager">Area Manager</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <Separator />
      <BundleEditor items={config.bundle} onChange={bundle => onChange({ ...config, bundle })} />
    </div>
  );
}

// ---- Asset Downtime Form ----
function AssetDowntimeForm({ config, onChange }: { config: AssetDowntimeConfig; onChange: (c: AssetDowntimeConfig) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Window (days)</Label>
            <InfoTooltip
              content={
                <div className="space-y-1">
                  <p className="font-semibold">Failure Detection Window</p>
                  <p>How far back to look when counting failures for a single asset.</p>
                  <p className="italic text-muted-foreground">Example: Window = 30 days + Min = 3 means "if this machine has failed 3 times in the last month, create a CA."</p>
                </div>
              }
            />
          </div>
          <Input type="number" min={1} value={config.window_days} onChange={e => onChange({ ...config, window_days: Number(e.target.value) })} className="h-9" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Min. failures</Label>
            <InfoTooltip content="The minimum number of downtime events for the same asset within the window before a CA is created. 3 is a good starting point for detecting patterns." />
          </div>
          <Input type="number" min={1} value={config.min_count} onChange={e => onChange({ ...config, min_count: Number(e.target.value) })} className="h-9" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Severity</Label>
            <InfoTooltip content="Severity assigned to the generated CA. Asset patterns are often Medium — serious enough to need tracking, but not an emergency unless the asset is critical." />
          </div>
          <Select value={config.severity} onValueChange={v => onChange({ ...config, severity: v as Severity })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Label className="text-xs">Due within (hours)</Label>
          <InfoTooltip content="How many hours the team has to resolve the CA after it's created. For asset issues, 72h gives time to schedule a technician visit." />
        </div>
        <Input type="number" min={1} value={config.due_hours} onChange={e => onChange({ ...config, due_hours: Number(e.target.value) })} className="h-9" />
      </div>
      <Separator />
      <BundleEditor items={config.bundle} onChange={bundle => onChange({ ...config, bundle })} />
    </div>
  );
}

// ---- Rule summary chip display ----
function RuleConfigSummary({ rule }: { rule: CorrectiveActionRule }) {
  const cfg = rule.trigger_config as Record<string, unknown>;
  const chips: string[] = [];
  if (cfg.severity) chips.push(`Severity: ${cfg.severity}`);
  if (cfg.due_hours) chips.push(`Due: ${cfg.due_hours}h`);
  if (cfg.window_days) chips.push(`Window: ${cfg.window_days}d`);
  if (cfg.min_count) chips.push(`Min: ${cfg.min_count}x`);
  if (cfg.stop_the_line) chips.push("Stop-the-Line");
  if (cfg.requires_approval) chips.push("Needs Approval");
  const bundle = Array.isArray(cfg.bundle) ? cfg.bundle : [];
  if (bundle.length) chips.push(`${bundle.length} action item${bundle.length > 1 ? "s" : ""}`);

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {chips.map(chip => (
        <span key={chip} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{chip}</span>
      ))}
    </div>
  );
}

// ---- Main Page ----
export default function CorrectiveActionRules() {
  const { data: rules = [], isLoading } = useCorrectiveActionRules();
  const createRule = useCreateCARule();
  const updateRule = useUpdateCARule();
  const deleteRule = useDeleteCARule();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<CorrectiveActionRule["trigger_type"]>("audit_fail");

  const [auditConfig, setAuditConfig] = useState<AuditFailConfig>(DEFAULT_AUDIT_FAIL);
  const [incidentConfig, setIncidentConfig] = useState<IncidentRepeatConfig>(DEFAULT_INCIDENT_REPEAT);
  const [assetConfig, setAssetConfig] = useState<AssetDowntimeConfig>(DEFAULT_ASSET_DOWNTIME);

  const getConfig = () => {
    if (triggerType === "audit_fail") return auditConfig;
    if (triggerType === "incident_repeat") return incidentConfig;
    return assetConfig;
  };

  const resetForm = () => {
    setName("");
    setTriggerType("audit_fail");
    setAuditConfig(DEFAULT_AUDIT_FAIL);
    setIncidentConfig(DEFAULT_INCIDENT_REPEAT);
    setAssetConfig(DEFAULT_ASSET_DOWNTIME);
  };

  const handleCreate = async () => {
    const config = getConfig();
    const bundle = (config as { bundle: BundleItem[] }).bundle;
    if (bundle.some(b => !b.title.trim())) {
      toast.error("All action items must have a title.");
      return;
    }
    try {
      await createRule.mutateAsync({
        name,
        enabled: true,
        trigger_type: triggerType,
        trigger_config: config as unknown as Record<string, unknown>,
      });
      toast.success("Rule created.");
      setCreateOpen(false);
      resetForm();
    } catch (err: unknown) {
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">CA Auto-Generation Rules</h1>
            <InfoTooltip
              side="right"
              content={
                <div className="space-y-2">
                  <p className="font-semibold">What are CA Rules?</p>
                  <p>Rules tell the system when to automatically create a Corrective Action — so managers don't miss recurring problems.</p>
                  <p className="font-medium">3 trigger types:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li><span className="font-medium text-foreground">Audit Failure</span> — fires when an audit is failed</li>
                    <li><span className="font-medium text-foreground">Incident Repeat</span> — fires when the same incident recurs X times</li>
                    <li><span className="font-medium text-foreground">Asset Downtime</span> — fires when an asset fails X times in Y days</li>
                  </ul>
                  <p className="italic text-muted-foreground">Example: "If any audit fails, create a High severity CA due in 24h, with tasks: fix the issue + root cause report."</p>
                </div>
              }
            />
          </div>
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
          <p className="text-muted-foreground text-xs mt-2">
            💡 Start with an <span className="font-medium">Audit Failure</span> rule — it's the most common trigger.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
              <CardContent className="pt-4 pb-4 flex items-start gap-4">
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
                  <RuleConfigSummary rule={rule} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <InfoTooltip
                    side="left"
                    content={rule.enabled
                      ? "This rule is active and will automatically create CAs when triggered. Toggle to pause it without deleting."
                      : "This rule is paused. Toggle to reactivate it."
                    }
                  />
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

      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Auto-Generation Rule</DialogTitle>
            <DialogDescription>
              Define when to automatically create a corrective action and what tasks to bundle with it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Rule Name */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Label>Rule Name</Label>
                <InfoTooltip content="Give the rule a clear name so managers know what it does at a glance. Include the trigger and location context if relevant." />
              </div>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Food Safety Critical Fail — All Stores" className="mt-1" />
            </div>

            {/* Trigger Type */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Label>Trigger Type</Label>
                <InfoTooltip
                  content={
                    <div className="space-y-1.5">
                      <p className="font-semibold">Choose what causes the CA to be created automatically</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><span className="font-medium text-foreground">Audit Failure</span> — when a checklist/audit is submitted with a fail result</li>
                        <li><span className="font-medium text-foreground">Incident Repeat</span> — when the same type of incident is logged multiple times</li>
                        <li><span className="font-medium text-foreground">Asset Downtime</span> — when a piece of equipment breaks down repeatedly</li>
                      </ul>
                    </div>
                  }
                />
              </div>
              <Select
                value={triggerType}
                onValueChange={(v) => setTriggerType(v as CorrectiveActionRule["trigger_type"])}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="audit_fail">
                    <div>
                      <p className="font-medium">Audit Failure</p>
                      <p className="text-xs text-muted-foreground">Triggers when an audit is failed or rated below threshold</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="incident_repeat">
                    <div>
                      <p className="font-medium">Incident Repeat</p>
                      <p className="text-xs text-muted-foreground">Triggers when the same incident recurs within a set window</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="asset_downtime_pattern">
                    <div>
                      <p className="font-medium">Asset Downtime Pattern</p>
                      <p className="text-xs text-muted-foreground">Triggers when an asset fails repeatedly in a time period</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Dynamic config form */}
            {triggerType === "audit_fail" && (
              <AuditFailForm config={auditConfig} onChange={setAuditConfig} />
            )}
            {triggerType === "incident_repeat" && (
              <IncidentRepeatForm config={incidentConfig} onChange={setIncidentConfig} />
            )}
            {triggerType === "asset_downtime_pattern" && (
              <AssetDowntimeForm config={assetConfig} onChange={setAssetConfig} />
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createRule.isPending || !name.trim()}>
              {createRule.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
