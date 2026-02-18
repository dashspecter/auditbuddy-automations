import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useLocations } from "@/hooks/useLocations";
import { useCreateCorrectiveAction, type CASourceType, type CASeverity } from "@/hooks/useCorrectiveActions";
import { InfoTooltip } from "@/components/correctiveActions/InfoTooltip";
import { toast } from "sonner";
import { addHours, format } from "date-fns";
import { PlusCircle, Trash2, UserCheck } from "lucide-react";

interface BundleItem {
  title: string;
  due_hours: number;
  evidence_required: boolean;
  assigned_role: string;
}

const ROLE_OPTIONS = [
  { value: "store_manager", label: "Store Manager" },
  { value: "area_manager", label: "Area Manager" },
  { value: "shift_lead", label: "Shift Lead" },
  { value: "staff", label: "Staff" },
  { value: "company_admin", label: "Company Admin" },
];

interface CreateCADialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: {
    sourceType?: CASourceType;
    sourceId?: string;
    title?: string;
    locationId?: string;
    severity?: CASeverity;
  };
  onCreated?: (caId: string) => void;
}

const SEVERITY_OPTIONS: { value: CASeverity; label: string; description: string }[] = [
  { value: "low", label: "Low", description: "7 days to resolve — minor issue, no immediate risk" },
  { value: "medium", label: "Medium", description: "72 hours to resolve — notable issue needing attention" },
  { value: "high", label: "High", description: "24 hours to resolve — significant risk or compliance breach" },
  { value: "critical", label: "Critical", description: "4 hours — auto stop-the-line, immediate action required" },
];

const SEVERITY_SLA: Record<CASeverity, number> = {
  low: 7 * 24,
  medium: 72,
  high: 24,
  critical: 4,
};

export function CreateCADialog({ open, onOpenChange, defaultValues, onCreated }: CreateCADialogProps) {
  const { data: locations } = useLocations();
  const createCA = useCreateCorrectiveAction();

  const [severity, setSeverity] = useState<CASeverity>(defaultValues?.severity ?? "medium");
  const [locationId, setLocationId] = useState(defaultValues?.locationId ?? "");
  const [stopTheLine, setStopTheLine] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: "",
      dueAt: format(addHours(new Date(), SEVERITY_SLA["medium"]), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const updateBundleItem = (index: number, patch: Partial<BundleItem>) =>
    setBundleItems(items => items.map((item, i) => i === index ? { ...item, ...patch } : item));

  const removeBundleItem = (index: number) =>
    setBundleItems(items => items.filter((_, i) => i !== index));

  const addBundleItem = () =>
    setBundleItems(items => [...items, { title: "", due_hours: 24, evidence_required: false, assigned_role: "store_manager" }]);

  const onSubmit = async (values: { title: string; description: string; dueAt: string }) => {
    if (!locationId) {
      toast.error("Please select a location.");
      return;
    }
    if (bundleItems.some(b => !b.title.trim())) {
      toast.error("All action items must have a title.");
      return;
    }

    try {
      const caId = await createCA.mutateAsync({
        locationId,
        sourceType: defaultValues?.sourceType ?? "manual",
        sourceId: defaultValues?.sourceId ?? crypto.randomUUID(),
        title: values.title,
        description: values.description || undefined,
        severity,
        dueAt: new Date(values.dueAt).toISOString(),
        stopTheLine: stopTheLine || severity === "critical",
        requiresApproval: requiresApproval || severity === "critical",
        approvalRole: requiresApproval ? "area_manager" : undefined,
        bundleItems: bundleItems.map(b => ({
          title: b.title,
          assigneeRole: b.assigned_role || undefined,
          dueAt: new Date(Date.now() + b.due_hours * 3600_000).toISOString(),
          evidenceRequired: b.evidence_required,
        })),
      });

      toast.success("Corrective Action created.");
      onCreated?.(caId);
      onOpenChange(false);
      reset();
      setBundleItems([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create CA.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Corrective Action</DialogTitle>
          <DialogDescription>
            Document and assign a corrective action to resolve this issue. The assignee will receive tasks to complete before it can be closed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Label htmlFor="title">Title *</Label>
              <InfoTooltip content="Describe the corrective action clearly so the assignee knows exactly what needs to be fixed." />
            </div>
            <Input
              id="title"
              {...register("title", { required: true })}
              placeholder="e.g. Fix fridge temperature at Store 3 — back to 2–4°C"
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Label htmlFor="description">Description</Label>
              <InfoTooltip content="Optional additional context — what happened, what evidence was found, and any background the assignee needs." />
            </div>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="e.g. Temperature logged at 9°C during morning audit. Compressor may need servicing..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Location */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Label>Location *</Label>
                <InfoTooltip content="The physical location this CA is tied to. Role-based assignees will be resolved from staff at this location." />
              </div>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Label>Severity *</Label>
                <InfoTooltip
                  content={
                    <div className="space-y-1.5">
                      <p className="font-semibold">Severity sets the SLA deadline</p>
                      {SEVERITY_OPTIONS.map(opt => (
                        <p key={opt.value}><span className="font-medium capitalize">{opt.label}</span> — {opt.description}</p>
                      ))}
                    </div>
                  }
                />
              </div>
              <Select
                value={severity}
                onValueChange={(v) => {
                  setSeverity(v as CASeverity);
                  if (v === "critical") setStopTheLine(true);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Label htmlFor="dueAt">Due Date *</Label>
              <InfoTooltip content="The deadline by which this CA must be fully resolved and closed. If missed, it escalates automatically." />
            </div>
            <Input
              id="dueAt"
              type="datetime-local"
              {...register("dueAt", { required: true })}
              className="mt-1"
            />
          </div>

          {/* Options */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">Requires Approval to Close</p>
                  <InfoTooltip content="A manager must explicitly approve the CA before it's marked closed — even after all items are done." />
                </div>
                <p className="text-xs text-muted-foreground">Manager approval needed before closing</p>
              </div>
              <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-destructive">Stop-the-Line</p>
                  <InfoTooltip content="Flags the location as restricted — a red banner appears for all users at that location until a manager manually releases it." />
                </div>
                <p className="text-xs text-muted-foreground">Restricts location operations until manually released</p>
              </div>
              <Switch
                checked={stopTheLine || severity === "critical"}
                onCheckedChange={setStopTheLine}
                disabled={severity === "critical"}
              />
            </div>
          </div>

          <Separator />

          {/* Bundle items */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm font-medium">Action Items</Label>
              <InfoTooltip
                content={
                  <div className="space-y-1.5">
                    <p className="font-semibold">Action Items</p>
                    <p>Optional tasks to bundle with this CA. Each item is assigned to a specific role at the location — the system finds the right person automatically.</p>
                    <p className="italic text-muted-foreground">Example: "Fix fridge" → assigned to Store Manager; "Confirm repair" → assigned to Area Manager.</p>
                  </div>
                }
              />
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </div>

            {bundleItems.map((item, index) => (
              <div key={index} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0">#{index + 1}</span>
                  <Input
                    value={item.title}
                    onChange={e => updateBundleItem(index, { title: e.target.value })}
                    placeholder="e.g. Take temperature reading and log result"
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeBundleItem(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Role selector */}
                <div className="flex items-center gap-2 pl-7">
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Select
                    value={item.assigned_role}
                    onValueChange={v => updateBundleItem(index, { assigned_role: v })}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1 max-w-[160px]">
                      <SelectValue placeholder="Assign to role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(r => (
                        <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <InfoTooltip
                    side="right"
                    content="The system will find who holds this role at the selected location and assign them this task automatically."
                  />
                </div>

                {/* Hours + evidence */}
                <div className="flex items-center gap-4 pl-7">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      value={item.due_hours}
                      onChange={e => updateBundleItem(index, { due_hours: Number(e.target.value) })}
                      className="w-14 h-7 text-xs text-center"
                    />
                    <span className="text-xs text-muted-foreground">hours due</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={item.evidence_required}
                      onCheckedChange={v => updateBundleItem(index, { evidence_required: v })}
                      className="scale-75"
                    />
                    <span className="text-xs text-muted-foreground">Evidence required</span>
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addBundleItem} className="w-full h-8 text-xs">
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Add Action Item
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCA.isPending}>
              {createCA.isPending ? "Creating..." : "Create CA"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateCADialog;
