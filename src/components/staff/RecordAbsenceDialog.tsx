import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { AlertTriangle, Loader2 } from "lucide-react";

const REASON_CODES = [
  { value: "sick", label: "Sick" },
  { value: "no_show", label: "No Show" },
  { value: "family_emergency", label: "Family Emergency" },
  { value: "excused", label: "Excused" },
  { value: "unplanned_vacation", label: "Unplanned Vacation" },
  { value: "personal", label: "Personal" },
  { value: "suspended", label: "Suspended" },
  { value: "other", label: "Other" },
] as const;

interface AbsenceData {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  shiftDate: string;
  locationId: string;
  companyId: string;
}

interface RecordAbsenceDialogProps {
  data: AbsenceData | null;
  onClose: () => void;
  onRecorded: () => void;
}

export const RecordAbsenceDialog = ({ data, onClose, onRecorded }: RecordAbsenceDialogProps) => {
  const [reasonCode, setReasonCode] = useState<string>("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!data || !reasonCode) return;

    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.rpc("create_workforce_exception", {
        p_company_id: data.companyId,
        p_location_id: data.locationId,
        p_employee_id: data.employeeId,
        p_exception_type: "absence",
        p_shift_id: data.shiftId,
        p_shift_date: data.shiftDate,
        p_reason_code: reasonCode,
        p_note: note.trim() || null,
        p_metadata: {},
      });

      if (error) throw error;

      toast({
        title: "Absence recorded",
        description: `${data.employeeName} marked as absent (${REASON_CODES.find(r => r.value === reasonCode)?.label}).`,
      });

      onRecorded();
      handleClose();
    } catch (error: any) {
      console.error("Error recording absence:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record absence.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReasonCode("");
    setNote("");
    onClose();
  };

  return (
    <Dialog open={!!data} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Record Absence
          </DialogTitle>
          <DialogDescription>
            {data && (
              <>
                <span className="font-medium text-foreground">{data.employeeName}</span>
                {" — "}
                {format(new Date(data.shiftDate + "T00:00:00"), "EEE, MMM d, yyyy")}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Reason</Label>
            <RadioGroup value={reasonCode} onValueChange={setReasonCode} className="grid grid-cols-2 gap-2">
              {REASON_CODES.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="text-sm cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="absence-note" className="text-sm font-medium mb-2 block">
              Note (optional)
            </Label>
            <Textarea
              id="absence-note"
              placeholder="Add any additional details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reasonCode || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Record Absence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
