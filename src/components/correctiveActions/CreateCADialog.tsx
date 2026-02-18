import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocations } from "@/hooks/useLocations";
import { useCreateCorrectiveAction, type CASourceType, type CASeverity, type CreateCAArgs } from "@/hooks/useCorrectiveActions";
import { InfoTooltip } from "@/components/correctiveActions/InfoTooltip";
import { toast } from "sonner";
import { addHours, format } from "date-fns";

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
  { value: "critical", label: "Critical", description: "4 hours to resolve — auto stop-the-line, immediate action required" },
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

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: "",
      dueAt: format(addHours(new Date(), SEVERITY_SLA["medium"]), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const onSubmit = async (values: { title: string; description: string; dueAt: string }) => {
    if (!locationId) {
      toast.error("Please select a location.");
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
      });

      toast.success("Corrective Action created.");
      onCreated?.(caId);
      onOpenChange(false);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create CA.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
              <InfoTooltip content="Describe the corrective action clearly so the assignee knows exactly what needs to be fixed. Be specific — include the issue and the expected outcome." />
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
              <InfoTooltip content="Optional additional context — what happened, what evidence was found, and any background the assignee needs to understand the problem." />
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
                <InfoTooltip content="The physical location this CA is tied to. This determines who can see and action it, and triggers stop-the-line banners at that location if enabled." />
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
                      <p className="italic text-muted-foreground mt-1">Critical automatically enables Stop-the-Line.</p>
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
              <InfoTooltip content="The deadline by which this CA must be fully resolved and closed. The SLA progress bar counts down to this date. If missed, it escalates automatically." />
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
                  <InfoTooltip
                    content={
                      <div className="space-y-1">
                        <p className="font-semibold">Approval Gate</p>
                        <p>When enabled, a manager must explicitly approve the CA before it's marked as closed — even if all action items are completed.</p>
                        <p className="italic text-muted-foreground">Use this for compliance-critical issues where a human sign-off is required.</p>
                      </div>
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">Manager approval needed before closing</p>
              </div>
              <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-destructive">Stop-the-Line</p>
                  <InfoTooltip
                    content={
                      <div className="space-y-1.5">
                        <p className="font-semibold">Stop-the-Line 🚨</p>
                        <p>Flags the selected location as restricted. A red banner appears across the app for all users at that location.</p>
                        <p>Operations must halt until a manager manually releases the restriction — with a recorded reason why it's safe to resume.</p>
                        <p className="italic text-muted-foreground">Example: Pest sighting at Store 3 → stop-the-line activated → all food prep halted until pest control confirms clearance.</p>
                        <p className="text-muted-foreground">⚠️ Automatically enabled for Critical severity.</p>
                      </div>
                    }
                  />
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
