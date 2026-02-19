import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ToggleLeft, ToggleRight, Settings2, PlusCircle, UserCheck, GraduationCap, Pencil, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InfoTooltip } from "@/components/correctiveActions/InfoTooltip";
import { useCorrectiveActionRules, useCreateCARule, useUpdateCARule, useDeleteCARule, type CorrectiveActionRule } from "@/hooks/useCorrectiveActions";
import { toast } from "sonner";

const TRIGGER_LABELS: Record<CorrectiveActionRule["trigger_type"], string> = {
  audit_fail: "Audit Failure",
  incident_repeat: "Incident Repeat",
  asset_downtime_pattern: "Asset Downtime Pattern",
  test_fail: "Test Failure",
};

const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"] as const;
type Severity = typeof SEVERITY_OPTIONS[number];

function useEmployeeRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employee_roles_distinct"],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get company_id first
      const { data: cu } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      const companyId = cu?.company_id;
      if (!companyId) return [];

      const { data } = await supabase
        .from("employees")
        .select("role")
        .eq("company_id", companyId)
        .not("role", "is", null)
        .neq("role", "");

      const distinct = [...new Set((data ?? []).map(r => r.role as string))].sort();
      return distinct.map(r => ({ value: r, label: r }));
    },
    staleTime: 60_000,
  });
}

interface BundleItem {
  title: string;
  due_hours: number;
  evidence_required: boolean;
  assigned_role?: string;
  assignee_role?: string;
}

interface FieldRule {
  field_id: string;
  field_name: string;
  field_type: string; // "rating", "yes_no", "yesno", "checkbox", "number"
  threshold?: number; // For rating (1-5) and number fields
  enabled: boolean;
  bundle: BundleItem[];
}

interface AuditFailConfig {
  severity: Severity;
  due_hours: number;
  stop_the_line: boolean;
  bundle: BundleItem[];
  template_id?: string;      // "any" or a specific template UUID
  field_rules?: FieldRule[]; // per-field threshold + bundle
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

interface TestFailConfig {
  test_id: string;
  severity: Severity;
  due_hours: number;
  bundle: BundleItem[];
}

const DEFAULT_AUDIT_FAIL: AuditFailConfig = {
  severity: "high",
  due_hours: 24,
  stop_the_line: false,
  template_id: "any",
  bundle: [
    { title: "Immediate corrective action", due_hours: 4, evidence_required: true, assigned_role: "store_manager" },
    { title: "Root cause investigation", due_hours: 24, evidence_required: false, assigned_role: "area_manager" },
  ],
  field_rules: [],
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

const DEFAULT_TEST_FAIL: TestFailConfig = {
  test_id: "any",
  severity: "low",
  due_hours: 168,
  bundle: [],
};

const SCORABLE_FIELD_TYPES = ["rating", "yes_no", "yesno", "checkbox", "number"];

function fieldTypeLabel(ft: string) {
  if (ft === "rating") return "Rating 1–5";
  if (ft === "yes_no" || ft === "yesno") return "Yes / No";
  if (ft === "checkbox") return "Checkbox";
  if (ft === "number") return "Number";
  return ft;
}

// ---- Bundle Items Editor ----
function BundleEditor({ items, onChange, compact = false, roleOptions = [] }: { items: BundleItem[]; onChange: (items: BundleItem[]) => void; compact?: boolean; roleOptions?: { value: string; label: string }[] }) {
  const update = (index: number, patch: Partial<BundleItem>) => {
    onChange(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { title: "", due_hours: 24, evidence_required: false, assigned_role: "store_manager" }]);

  return (
    <div className="space-y-3">
      {!compact && (
        <>
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">Action Items to Bundle</Label>
            <InfoTooltip
              content={
                <div className="space-y-1.5">
                  <p className="font-semibold">Bundled Action Items</p>
                  <p>These are the specific tasks that will be automatically created and assigned when this rule fires.</p>
                  <p className="italic text-muted-foreground">Each person assigned will see these as checklist items to complete before the CA can be closed.</p>
                </div>
              }
            />
          </div>
          <p className="text-xs text-muted-foreground -mt-1">Tasks automatically assigned when this rule triggers</p>
        </>
      )}
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
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 pl-7">
            <div className="flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={item.assigned_role ?? item.assignee_role ?? "unassigned"}
                onValueChange={v => update(index, { assigned_role: v === "unassigned" ? undefined : v, assignee_role: v === "unassigned" ? undefined : v })}
              >
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue placeholder="Assign to role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {roleOptions.map(r => (
                    <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InfoTooltip
                side="right"
                content={
                  <div className="space-y-1">
                    <p className="font-semibold">Assigned Role</p>
                    <p>When this CA fires, the system looks up who holds this role at the affected location and automatically assigns them this task — they'll see it as "Action Required" on their mobile dashboard.</p>
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
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={item.evidence_required}
                  onCheckedChange={v => update(index, { evidence_required: v })}
                  className="scale-75"
                />
                <span className="text-xs text-muted-foreground">Evidence required</span>
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

// ---- Field Rule Row (one per scorable audit field) ----
function FieldRuleRow({
  fieldRule,
  onChange,
  roleOptions = [],
}: {
  fieldRule: FieldRule;
  onChange: (updated: FieldRule) => void;
  roleOptions?: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const isYesNo = fieldRule.field_type === "yes_no" || fieldRule.field_type === "yesno" || fieldRule.field_type === "checkbox";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card">
        {/* Header row */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Switch
            checked={fieldRule.enabled}
            onCheckedChange={v => onChange({ ...fieldRule, enabled: v })}
            className="scale-75 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium truncate ${!fieldRule.enabled ? "text-muted-foreground" : "text-foreground"}`}>
                {fieldRule.field_name}
              </span>
              <Badge variant="outline" className="text-[10px] shrink-0">{fieldTypeLabel(fieldRule.field_type)}</Badge>
              {fieldRule.enabled && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {isYesNo
                    ? "Triggers on: NO"
                    : `Triggers if ≤ ${fieldRule.threshold ?? 3}`}
                </span>
              )}
              {fieldRule.enabled && fieldRule.bundle.length > 0 && (
                <span className="text-[10px] text-primary shrink-0">
                  {fieldRule.bundle.length} task{fieldRule.bundle.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              disabled={!fieldRule.enabled}
            >
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3 border-t">
            {/* Threshold config */}
            {!isYesNo && (
              <div className="flex items-center gap-3 pt-2.5">
                <Label className="text-xs text-muted-foreground shrink-0">Trigger if score ≤</Label>
                <Input
                  type="number"
                  min={1}
                  max={fieldRule.field_type === "rating" ? 4 : 9999}
                  value={fieldRule.threshold ?? 3}
                  onChange={e => onChange({ ...fieldRule, threshold: Number(e.target.value) })}
                  className="w-16 h-7 text-xs text-center"
                />
                {fieldRule.field_type === "rating" && (
                  <span className="text-xs text-muted-foreground">(1–5 scale; 3 = fires if rated 1, 2, or 3)</span>
                )}
              </div>
            )}
            {isYesNo && (
              <p className="text-xs text-muted-foreground pt-2.5">
                Triggers automatically when this field is answered <span className="font-semibold text-destructive">NO</span>.
              </p>
            )}

            <Separator />

            {/* Per-field bundle editor */}
            <div>
              <p className="text-xs font-medium text-foreground mb-2">
                Action items for this field failure
                <InfoTooltip
                  side="right"
                  content="Add one task per role. Each assigned role holder will get their own 'Action Required' card on their mobile dashboard."
                />
              </p>
              <BundleEditor
                items={fieldRule.bundle}
                onChange={bundle => onChange({ ...fieldRule, bundle })}
                compact
                roleOptions={roleOptions}
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ---- Audit Fail Form ----
function AuditFailForm({ config, onChange, roleOptions = [] }: { config: AuditFailConfig; onChange: (c: AuditFailConfig) => void; roleOptions?: { value: string; label: string }[] }) {
  // Fetch audit templates for the company
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["audit_templates_for_rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_templates")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });

  // Fetch fields for the selected template (only when a specific template is chosen)
  const selectedTemplateId = config.template_id && config.template_id !== "any" ? config.template_id : null;
  const { data: templateFieldsData, isLoading: fieldsLoading } = useQuery({
    queryKey: ["audit_template_scorable_fields", selectedTemplateId],
    enabled: !!selectedTemplateId,
    queryFn: async () => {
      const { data: sections, error } = await supabase
        .from("audit_sections")
        .select("id, name, display_order, audit_fields(id, name, field_type, display_order)")
        .eq("template_id", selectedTemplateId!)
        .order("display_order");
      if (error) throw error;
      // Flatten to scorable fields only
      const fields: { id: string; name: string; field_type: string; section_name: string }[] = [];
      for (const section of sections ?? []) {
        for (const f of (section.audit_fields as any[]) ?? []) {
          if (SCORABLE_FIELD_TYPES.includes(f.field_type)) {
            fields.push({ id: f.id, name: f.name, field_type: f.field_type, section_name: section.name });
          }
        }
      }
      return fields;
    },
  });

  // Sync field_rules when template fields load
  const handleTemplateChange = (newTemplateId: string) => {
    // Reset field_rules when template changes
    onChange({ ...config, template_id: newTemplateId, field_rules: [] });
  };

  // Build merged field rules: keep existing configs, add new fields
  const mergedFieldRules: FieldRule[] = (() => {
    if (!templateFieldsData) return config.field_rules ?? [];
    const existingById: Record<string, FieldRule> = {};
    for (const fr of config.field_rules ?? []) {
      existingById[fr.field_id] = fr;
    }
    return templateFieldsData.map(f => existingById[f.id] ?? {
      field_id: f.id,
      field_name: f.name,
      field_type: f.field_type,
      threshold: f.field_type === "rating" ? 3 : undefined,
      enabled: false,
      bundle: [],
    });
  })();

  const updateFieldRule = (index: number, updated: FieldRule) => {
    const next = [...mergedFieldRules];
    next[index] = updated;
    onChange({ ...config, field_rules: next });
  };

  const isFieldMode = selectedTemplateId != null;
  const enabledFieldCount = mergedFieldRules.filter(fr => fr.enabled).length;

  return (
    <div className="space-y-4">
      {/* Global severity + due hours */}
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
            <InfoTooltip content="The CA must be fully resolved and closed within this many hours after being created." />
          </div>
          <Input
            type="number" min={1}
            value={config.due_hours}
            onChange={e => onChange({ ...config, due_hours: Number(e.target.value) })}
            className="h-9"
          />
        </div>
      </div>

      {/* Stop-the-line */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-destructive">Stop-the-Line</p>
            <InfoTooltip
              content={
                <div className="space-y-1.5">
                  <p className="font-semibold">Stop-the-Line 🚨</p>
                  <p>When enabled, the location is flagged as restricted and a red banner appears across the entire app for that location. All operations must halt until a manager manually releases it.</p>
                </div>
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">Restrict location operations until manually released by a manager</p>
        </div>
        <Switch checked={config.stop_the_line} onCheckedChange={v => onChange({ ...config, stop_the_line: v })} />
      </div>

      <Separator />

      {/* Template selector */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Label className="text-xs font-medium">Apply to</Label>
          <InfoTooltip content="Select a specific audit template to enable per-field threshold rules. Leave as 'Any audit' to use the global bundle for all audit failures." />
        </div>
        <Select
          value={config.template_id ?? "any"}
          onValueChange={handleTemplateChange}
          disabled={templatesLoading}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select template..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">
              <div>
                <p className="font-medium">Any audit</p>
                <p className="text-xs text-muted-foreground">Fires on any failed audit (uses global bundle below)</p>
              </div>
            </SelectItem>
            {templates.map((t: { id: string; name: string }) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Field rules builder — shown only when a specific template is selected */}
      {isFieldMode && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Field Rules</Label>
            <InfoTooltip
              content={
                <div className="space-y-1.5">
                  <p className="font-semibold">Per-Field Threshold Rules</p>
                  <p>Enable a field to configure when it triggers a CA (e.g. rating ≤ 3) and which tasks + roles get created.</p>
                  <p>Each role assigned gets their own "Action Required" card on their mobile dashboard.</p>
                  <p className="italic text-muted-foreground">Add multiple action items to assign different roles for the same failing field.</p>
                </div>
              }
            />
            {enabledFieldCount > 0 && (
              <Badge variant="secondary" className="text-xs">{enabledFieldCount} active</Badge>
            )}
          </div>

          {fieldsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : mergedFieldRules.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
              No scorable fields found in this template (rating, yes/no, number).
            </div>
          ) : (
            <div className="space-y-2">
              {mergedFieldRules.map((fr, i) => (
                <FieldRuleRow
                  key={fr.field_id}
                  fieldRule={fr}
                  onChange={updated => updateFieldRule(i, updated)}
                  roleOptions={roleOptions}
                />
              ))}
            </div>
          )}

          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            💡 Each enabled field creates its own CA when its threshold is crossed. Multiple roles can be assigned by adding multiple action items.
          </div>
        </div>
      )}

      {/* Global bundle — shown when "Any audit" is selected */}
      {!isFieldMode && (
        <>
          <Separator />
          <BundleEditor items={config.bundle} onChange={bundle => onChange({ ...config, bundle })} roleOptions={roleOptions} />
        </>
      )}
    </div>
  );
}

// ---- Incident Repeat Form ----
function IncidentRepeatForm({ config, onChange, roleOptions = [] }: { config: IncidentRepeatConfig; onChange: (c: IncidentRepeatConfig) => void; roleOptions?: { value: string; label: string }[] }) {
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
                  <p>The system looks back this many days when counting incidents.</p>
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
            <InfoTooltip content="The minimum number of times the same incident must occur within the window before a CA is automatically created." />
          </div>
          <Input type="number" min={1} value={config.min_count} onChange={e => onChange({ ...config, min_count: Number(e.target.value) })} className="h-9" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Severity</Label>
            <InfoTooltip content="The severity level of the CA that gets created." />
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
                  <p>When enabled, a manager or admin must explicitly approve the CA before it can be marked closed.</p>
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
            <InfoTooltip content="Which role level is allowed to approve and close this CA." />
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
      <BundleEditor items={config.bundle} onChange={bundle => onChange({ ...config, bundle })} roleOptions={roleOptions} />
    </div>
  );
}

// ---- Asset Downtime Form ----
function AssetDowntimeForm({ config, onChange, roleOptions = [] }: { config: AssetDowntimeConfig; onChange: (c: AssetDowntimeConfig) => void; roleOptions?: { value: string; label: string }[] }) {
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
            <InfoTooltip content="The minimum number of downtime events for the same asset within the window before a CA is created." />
          </div>
          <Input type="number" min={1} value={config.min_count} onChange={e => onChange({ ...config, min_count: Number(e.target.value) })} className="h-9" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Severity</Label>
            <InfoTooltip content="Severity assigned to the generated CA." />
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
          <InfoTooltip content="How many hours the team has to resolve the CA after it's created." />
        </div>
        <Input type="number" min={1} value={config.due_hours} onChange={e => onChange({ ...config, due_hours: Number(e.target.value) })} className="h-9" />
      </div>
      <Separator />
      <BundleEditor items={config.bundle} onChange={bundle => onChange({ ...config, bundle })} roleOptions={roleOptions} />
    </div>
  );
}

// ---- Test Fail Form ----
function TestFailForm({ config, onChange }: { config: TestFailConfig; onChange: (c: TestFailConfig) => void }) {
  const { data: tests = [] } = useQuery({
    queryKey: ["tests_for_rules"],
    queryFn: async () => {
      const { data } = await supabase.from("tests").select("id, title").order("title");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 flex gap-2.5 items-start">
        <GraduationCap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          This rule fires automatically when an employee submits a test with a failing score. A Corrective Action is created and the employee is assigned the retake task.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Label className="text-xs">Apply to</Label>
          <InfoTooltip content="Select a specific test to watch, or choose 'Any test' to fire this rule whenever any test is failed." />
        </div>
        <Select value={config.test_id} onValueChange={v => onChange({ ...config, test_id: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">
              <div>
                <p className="font-medium">Any test</p>
                <p className="text-xs text-muted-foreground">Fires on any failed test submission</p>
              </div>
            </SelectItem>
            {tests.map((t: { id: string; title: string }) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-xs">Severity</Label>
            <InfoTooltip content="Low severity = 7-day SLA, which is appropriate for a test retake window. Increase if the test is safety-critical." />
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
            <InfoTooltip content="How many hours the employee has to complete the retake. 168h = 7 days." />
          </div>
          <Input
            type="number" min={1}
            value={config.due_hours}
            onChange={e => onChange({ ...config, due_hours: Number(e.target.value) })}
            className="h-9"
          />
        </div>
      </div>

      <div className="rounded-lg border border-muted bg-muted/30 px-3 py-2.5 flex gap-2.5 items-start">
        <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-foreground">Retake task auto-created</p>
          <p className="text-xs text-muted-foreground">
            When this rule fires, the system automatically assigns the employee a "Retake the failed test" task due within the hours you set above. No additional action items are required.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Rule summary chip display ----
function RuleConfigSummary({ rule, tests, templates }: { rule: CorrectiveActionRule; tests: { id: string; title: string }[]; templates: { id: string; name: string }[] }) {
  const cfg = rule.trigger_config as Record<string, unknown>;
  const chips: string[] = [];
  if (cfg.severity) chips.push(`Severity: ${cfg.severity}`);
  if (cfg.due_hours) chips.push(`Due: ${cfg.due_hours}h`);
  if (cfg.window_days) chips.push(`Window: ${cfg.window_days}d`);
  if (cfg.min_count) chips.push(`Min: ${cfg.min_count}x`);
  if (cfg.stop_the_line) chips.push("Stop-the-Line");
  if (cfg.requires_approval) chips.push("Needs Approval");

  if (rule.trigger_type === "test_fail") {
    if (cfg.test_id && cfg.test_id !== "any") {
      const testName = tests.find(t => t.id === cfg.test_id)?.title;
      chips.push(testName ? `Test: ${testName}` : "Specific test");
    } else {
      chips.push("Any test");
    }
  }

  if (rule.trigger_type === "audit_fail") {
    const templateId = cfg.template_id as string | undefined;
    if (templateId && templateId !== "any") {
      const tpl = templates.find(t => t.id === templateId);
      chips.push(tpl ? `Template: ${tpl.name}` : "Specific template");
    } else {
      chips.push("Any audit");
    }
    const fieldRules = Array.isArray(cfg.field_rules) ? cfg.field_rules : [];
    const enabledFieldRules = fieldRules.filter((fr: any) => fr.enabled);
    if (enabledFieldRules.length > 0) {
      chips.push(`${enabledFieldRules.length} field rule${enabledFieldRules.length > 1 ? "s" : ""}`);
    }
  }

  const bundle = Array.isArray(cfg.bundle) ? cfg.bundle : [];
  if (bundle.length) chips.push(`${bundle.length} global action item${bundle.length > 1 ? "s" : ""}`);

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
  const { data: roleOptions = [] } = useEmployeeRoles();

  const { data: allTests = [] } = useQuery({
    queryKey: ["tests_for_rules_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("tests").select("id, title").order("title");
      return data ?? [];
    },
  });

  const { data: allTemplates = [] } = useQuery({
    queryKey: ["audit_templates_for_rules_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_templates").select("id, name").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState<CorrectiveActionRule | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<CorrectiveActionRule["trigger_type"]>("audit_fail");
  const [auditConfig, setAuditConfig] = useState<AuditFailConfig>(DEFAULT_AUDIT_FAIL);
  const [incidentConfig, setIncidentConfig] = useState<IncidentRepeatConfig>(DEFAULT_INCIDENT_REPEAT);
  const [assetConfig, setAssetConfig] = useState<AssetDowntimeConfig>(DEFAULT_ASSET_DOWNTIME);
  const [testFailConfig, setTestFailConfig] = useState<TestFailConfig>(DEFAULT_TEST_FAIL);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editAuditConfig, setEditAuditConfig] = useState<AuditFailConfig>(DEFAULT_AUDIT_FAIL);
  const [editIncidentConfig, setEditIncidentConfig] = useState<IncidentRepeatConfig>(DEFAULT_INCIDENT_REPEAT);
  const [editAssetConfig, setEditAssetConfig] = useState<AssetDowntimeConfig>(DEFAULT_ASSET_DOWNTIME);
  const [editTestFailConfig, setEditTestFailConfig] = useState<TestFailConfig>(DEFAULT_TEST_FAIL);

  const getConfig = () => {
    if (triggerType === "audit_fail") return auditConfig;
    if (triggerType === "incident_repeat") return incidentConfig;
    if (triggerType === "test_fail") return testFailConfig;
    return assetConfig;
  };

  const getEditConfig = (rule: CorrectiveActionRule) => {
    if (rule.trigger_type === "audit_fail") return editAuditConfig;
    if (rule.trigger_type === "incident_repeat") return editIncidentConfig;
    if (rule.trigger_type === "test_fail") return editTestFailConfig;
    return editAssetConfig;
  };

  const resetForm = () => {
    setName("");
    setTriggerType("audit_fail");
    setAuditConfig(DEFAULT_AUDIT_FAIL);
    setIncidentConfig(DEFAULT_INCIDENT_REPEAT);
    setAssetConfig(DEFAULT_ASSET_DOWNTIME);
    setTestFailConfig(DEFAULT_TEST_FAIL);
  };

  const openEdit = (rule: CorrectiveActionRule) => {
    setEditRule(rule);
    setEditName(rule.name);
    const cfg = rule.trigger_config as Record<string, unknown>;
    if (rule.trigger_type === "audit_fail") {
      setEditAuditConfig({
        severity: (cfg.severity as Severity) ?? "high",
        due_hours: (cfg.due_hours as number) ?? 24,
        stop_the_line: (cfg.stop_the_line as boolean) ?? false,
        bundle: (cfg.bundle as BundleItem[]) ?? [],
        template_id: (cfg.template_id as string) ?? "any",
        field_rules: (cfg.field_rules as FieldRule[]) ?? [],
      });
    } else if (rule.trigger_type === "incident_repeat") {
      setEditIncidentConfig({
        window_days: (cfg.window_days as number) ?? 14,
        min_count: (cfg.min_count as number) ?? 2,
        severity: (cfg.severity as Severity) ?? "high",
        requires_approval: (cfg.requires_approval as boolean) ?? true,
        approval_role: (cfg.approval_role as string) ?? "area_manager",
        bundle: (cfg.bundle as BundleItem[]) ?? [],
      });
    } else if (rule.trigger_type === "asset_downtime_pattern") {
      setEditAssetConfig({
        window_days: (cfg.window_days as number) ?? 30,
        min_count: (cfg.min_count as number) ?? 3,
        severity: (cfg.severity as Severity) ?? "medium",
        due_hours: (cfg.due_hours as number) ?? 72,
        bundle: (cfg.bundle as BundleItem[]) ?? [],
      });
    } else if (rule.trigger_type === "test_fail") {
      setEditTestFailConfig({
        test_id: (cfg.test_id as string) ?? "any",
        severity: (cfg.severity as Severity) ?? "low",
        due_hours: (cfg.due_hours as number) ?? 168,
        bundle: (cfg.bundle as BundleItem[]) ?? [],
      });
    }
  };

  const validateBundles = (config: any, triggerType: string): boolean => {
    if (triggerType === "test_fail") return true;
    if (triggerType === "audit_fail") {
      const ac = config as AuditFailConfig;
      // In field-rules mode, validate each enabled field's bundle
      if (ac.template_id && ac.template_id !== "any" && ac.field_rules && ac.field_rules.length > 0) {
        for (const fr of ac.field_rules) {
          if (fr.enabled && fr.bundle.some((b: BundleItem) => !b.title.trim())) {
            toast.error("All action items in field rules must have a title.");
            return false;
          }
        }
        return true;
      }
    }
    // Global bundle mode
    const bundle = (config as { bundle: BundleItem[] }).bundle;
    if (bundle.some((b: BundleItem) => !b.title.trim())) {
      toast.error("All action items must have a title.");
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a rule name.");
      return;
    }
    const config = getConfig();
    if (!validateBundles(config, triggerType)) return;

    try {
      await createRule.mutateAsync({
        name: name.trim(),
        enabled: true,
        trigger_type: triggerType,
        trigger_config: config as unknown as Record<string, unknown>,
      });
      toast.success("Rule created.");
      setCreateOpen(false);
      resetForm();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || "Failed to create rule.";
      toast.error(message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editRule) return;
    if (!editName.trim()) {
      toast.error("Please enter a rule name.");
      return;
    }
    const config = getEditConfig(editRule);
    if (!validateBundles(config, editRule.trigger_type)) return;

    try {
      await updateRule.mutateAsync({
        id: editRule.id,
        name: editName.trim(),
        trigger_config: config as unknown as Record<string, unknown>,
      });
      toast.success("Rule updated.");
      setEditRule(null);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || "Failed to update rule.";
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
                  <p className="font-medium">4 trigger types:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li><span className="font-medium text-foreground">Audit Failure</span> — fires when specific audit fields fail their threshold</li>
                    <li><span className="font-medium text-foreground">Incident Repeat</span> — fires when the same incident recurs X times</li>
                    <li><span className="font-medium text-foreground">Asset Downtime</span> — fires when an asset fails X times in Y days</li>
                    <li><span className="font-medium text-foreground">Test Failure</span> — fires when an employee fails a test</li>
                  </ul>
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
            💡 Start with an <span className="font-medium">Audit Failure</span> rule — select a template and configure per-field thresholds.
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
                  <RuleConfigSummary rule={rule} tests={allTests} templates={allTemplates} />
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
                    onClick={() => openEdit(rule)}
                    title="Edit rule"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Auto-Generation Rule</DialogTitle>
            <DialogDescription>
              Define when to automatically create a corrective action and what tasks to bundle with it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Label>Rule Name</Label>
                <InfoTooltip content="Give the rule a clear name so managers know what it does at a glance." />
              </div>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Food Safety Critical Fail — All Stores" className="mt-1" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Label>Trigger Type</Label>
                <InfoTooltip
                  content={
                    <div className="space-y-1.5">
                      <p className="font-semibold">Choose what causes the CA to be created automatically</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li><span className="font-medium text-foreground">Audit Failure</span> — when specific audit fields fail their threshold</li>
                        <li><span className="font-medium text-foreground">Incident Repeat</span> — when the same type of incident is logged multiple times</li>
                        <li><span className="font-medium text-foreground">Asset Downtime</span> — when a piece of equipment breaks down repeatedly</li>
                        <li><span className="font-medium text-foreground">Test Failure</span> — when an employee fails a training test</li>
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
                      <p className="text-xs text-muted-foreground">Triggers when specific audit fields fail their threshold</p>
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
                  <SelectItem value="test_fail">
                    <div>
                      <p className="font-medium">Test Failure</p>
                      <p className="text-xs text-muted-foreground">Triggers when an employee fails a training test</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {triggerType === "audit_fail" && (
              <AuditFailForm config={auditConfig} onChange={setAuditConfig} roleOptions={roleOptions} />
            )}
            {triggerType === "incident_repeat" && (
              <IncidentRepeatForm config={incidentConfig} onChange={setIncidentConfig} roleOptions={roleOptions} />
            )}
            {triggerType === "asset_downtime_pattern" && (
              <AssetDowntimeForm config={assetConfig} onChange={setAssetConfig} roleOptions={roleOptions} />
            )}
            {triggerType === "test_fail" && (
              <TestFailForm config={testFailConfig} onChange={setTestFailConfig} />
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

      {/* Edit Dialog */}
      <Dialog open={!!editRule} onOpenChange={(v) => { if (!v) setEditRule(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rule</DialogTitle>
            <DialogDescription>
              Update the rule configuration. The trigger type cannot be changed.
            </DialogDescription>
          </DialogHeader>

          {editRule && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Label>Rule Name</Label>
                </div>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Rule name" className="mt-1" />
              </div>

              <div>
                <Label className="text-sm">Trigger Type</Label>
                <div className="mt-1 h-9 px-3 flex items-center rounded-md border bg-muted/40 text-sm text-muted-foreground">
                  {TRIGGER_LABELS[editRule.trigger_type]}
                </div>
              </div>

              <Separator />

              {editRule.trigger_type === "audit_fail" && (
                <AuditFailForm config={editAuditConfig} onChange={setEditAuditConfig} roleOptions={roleOptions} />
              )}
              {editRule.trigger_type === "incident_repeat" && (
                <IncidentRepeatForm config={editIncidentConfig} onChange={setEditIncidentConfig} roleOptions={roleOptions} />
              )}
              {editRule.trigger_type === "asset_downtime_pattern" && (
                <AssetDowntimeForm config={editAssetConfig} onChange={setEditAssetConfig} roleOptions={roleOptions} />
              )}
              {editRule.trigger_type === "test_fail" && (
                <TestFailForm config={editTestFailConfig} onChange={setEditTestFailConfig} />
              )}
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditRule(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateRule.isPending || !editName.trim()}>
              {updateRule.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
