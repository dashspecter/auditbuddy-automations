import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface ManualCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: {
    id: string;
    staff_id: string;
    check_in_at: string;
    employees?: { full_name: string };
    shift_id?: string | null;
  } | null;
}

export function ManualCheckoutDialog({ open, onOpenChange, log }: ManualCheckoutDialogProps) {
  const queryClient = useQueryClient();
  const [checkoutTime, setCheckoutTime] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!log || !checkoutTime) throw new Error("Missing data");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build the full checkout datetime using the check-in date
      const checkInDate = log.check_in_at.split("T")[0];
      const checkOutAt = new Date(`${checkInDate}T${checkoutTime}`).toISOString();

      // Calculate hours_short if shift exists
      let hoursShort: number | null = null;
      if (log.shift_id) {
        const { data: shiftData } = await supabase
          .from("shifts")
          .select("start_time, end_time, shift_date")
          .eq("id", log.shift_id)
          .single();

        if (shiftData) {
          const shiftStart = new Date(`${shiftData.shift_date}T${shiftData.start_time}`);
          let shiftEnd = new Date(`${shiftData.shift_date}T${shiftData.end_time}`);
          if (shiftEnd <= shiftStart) shiftEnd = new Date(shiftEnd.getTime() + 86400000);
          const scheduledHours = (shiftEnd.getTime() - shiftStart.getTime()) / 3600000;
          const actualHours = (new Date(checkOutAt).getTime() - new Date(log.check_in_at).getTime()) / 3600000;
          const short = Math.max(0, Math.round((scheduledHours - actualHours) * 10) / 10);
          if (short > 0) hoursShort = short;
        }
      }

      const { error } = await supabase
        .from("attendance_logs")
        .update({
          check_out_at: checkOutAt,
          auto_clocked_out: false,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          notes: notes.trim() || null,
          ...(hoursShort !== null ? { hours_short: hoursShort } : {}),
        } as any)
        .eq("id", log.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-logs"] });
      toast.success("Check-out time updated");
      onOpenChange(false);
      setCheckoutTime("");
      setNotes("");
    },
    onError: (err) => {
      toast.error("Failed to update check-out", { description: (err as Error).message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manual Check-Out</DialogTitle>
          <DialogDescription>
            Enter the actual check-out time for {log?.employees?.full_name || "this employee"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Check-out time</Label>
            <Input
              type="time"
              value={checkoutTime}
              onChange={(e) => setCheckoutTime(e.target.value)}
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="e.g. Employee confirmed they left at this time"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
          <Button
            className="w-full"
            disabled={!checkoutTime || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Check-Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
