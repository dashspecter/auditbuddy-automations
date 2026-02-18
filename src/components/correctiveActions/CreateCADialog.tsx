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

const SEVERITY_OPTIONS: { value: CASeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
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

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: "",
      dueAt: format(addHours(new Date(), SEVERITY_SLA["medium"]), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  // Update due date when severity changes
  const getDefaultDue = (sev: CASeverity) =>
    format(addHours(new Date(), SEVERITY_SLA[sev]), "yyyy-MM-dd'T'HH:mm");

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
            Document and assign a corrective action to resolve this issue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register("title", { required: true })}
              placeholder="Describe the required corrective action..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Additional context or details..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Location *</Label>
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

            <div>
              <Label>Severity *</Label>
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
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="dueAt">Due Date *</Label>
            <Input
              id="dueAt"
              type="datetime-local"
              {...register("dueAt", { required: true })}
              className="mt-1"
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Requires Approval to Close</p>
                <p className="text-xs text-muted-foreground">Manager approval needed before closing</p>
              </div>
              <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">Stop-the-Line</p>
                <p className="text-xs text-muted-foreground">Restricts location operations</p>
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
