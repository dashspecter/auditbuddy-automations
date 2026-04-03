import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CalendarClock, Wrench } from "lucide-react";
import { useCreateGovAssetReservation } from "@/hooks/useGovAssetReservations";
import { useGovProjects } from "@/hooks/useGovProjects";
import { useAssetConflicts } from "@/hooks/useAssetConflicts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  project_id: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  status: z.enum(["tentative", "confirmed"]),
  notes: z.string().optional(),
}).refine(d => !d.end_date || !d.start_date || d.end_date >= d.start_date, {
  message: "End date must be on or after start date",
  path: ["end_date"],
});

type FormValues = z.infer<typeof schema>;

interface Props {
  assetId: string;
  assetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeReservationId?: string;
}

export function ReservationDialog({ assetId, assetName, open, onOpenChange, excludeReservationId }: Props) {
  const createReservation = useCreateGovAssetReservation();
  const { data: projects = [] } = useGovProjects({ status: ["active", "draft"] });
  const [confirmedDespiteConflicts, setConfirmedDespiteConflicts] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_id: "",
      start_date: today,
      end_date: today,
      status: "confirmed",
      notes: "",
    },
  });

  const watchedStart = form.watch("start_date");
  const watchedEnd = form.watch("end_date");

  const { data: conflicts = [], isFetching: conflictsFetching } = useAssetConflicts(
    assetId,
    watchedStart,
    watchedEnd,
    excludeReservationId,
  );

  const hasConflicts = conflicts.length > 0;

  // Reset override whenever dates change
  const handleDateChange = () => {
    setConfirmedDespiteConflicts(false);
  };

  const onSubmit = async (values: FormValues) => {
    await createReservation.mutateAsync({
      asset_id: assetId,
      project_id: values.project_id || undefined,
      start_date: values.start_date,
      end_date: values.end_date,
      status: values.status,
      notes: values.notes || undefined,
    });
    form.reset();
    setConfirmedDespiteConflicts(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); setConfirmedDespiteConflicts(false); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reserve Asset</DialogTitle>
          <p className="text-sm text-muted-foreground">{assetName}</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-1">
            {projects.length > 0 && (
              <FormField control={form.control} name="project_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Project (optional)</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={v => field.onChange(v === "none" ? "" : v)}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="No specific project" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No specific project</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.project_number ? `${p.project_number} · ` : ""}{p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} onChange={e => { field.onChange(e); handleDateChange(); }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="end_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} onChange={e => { field.onChange(e); handleDateChange(); }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* ── Conflict warning panel ─────────────────────────────────── */}
            {!conflictsFetching && hasConflicts && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Scheduling conflict detected
                </div>
                <ul className="space-y-1.5">
                  {conflicts.map(c => (
                    <li key={`${c.source}-${c.id}`} className="flex items-start gap-2 text-xs text-amber-700">
                      {c.source === 'reservation'
                        ? <CalendarClock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        : <Wrench className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                      <span>
                        <span className="font-medium">{c.title}</span>
                        {c.project_title && <span className="text-amber-600"> · {c.project_title}</span>}
                        <span className="ml-1 text-amber-500">{c.start_date} – {c.end_date}</span>
                        {" "}
                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-amber-400 text-amber-700">
                          {c.status}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="confirmed" id="r-confirmed" />
                      <Label htmlFor="r-confirmed" className="font-normal cursor-pointer">Confirmed</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="tentative" id="r-tentative" />
                      <Label htmlFor="r-tentative" className="font-normal cursor-pointer">Tentative</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Optional notes…" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              {hasConflicts && !confirmedDespiteConflicts ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmedDespiteConflicts(true)}
                >
                  Save Anyway
                </Button>
              ) : (
                <Button type="submit" disabled={createReservation.isPending}>
                  {createReservation.isPending ? "Reserving…" : "Reserve Asset"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
