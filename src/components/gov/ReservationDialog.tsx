import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateGovAssetReservation } from "@/hooks/useGovAssetReservations";
import { useGovProjects } from "@/hooks/useGovProjects";
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
}

export function ReservationDialog({ assetId, assetName, open, onOpenChange }: Props) {
  const createReservation = useCreateGovAssetReservation();
  const { data: projects = [] } = useGovProjects({ status: ["active", "draft"] });

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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="end_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

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
              <Button type="submit" disabled={createReservation.isPending}>
                {createReservation.isPending ? "Reserving…" : "Reserve Asset"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
