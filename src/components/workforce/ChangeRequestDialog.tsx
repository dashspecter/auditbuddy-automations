import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  SCHEDULE_CHANGE_REASON_CODES,
  useCreateChangeRequest 
} from "@/hooks/useScheduleGovernance";
import { AlertTriangle } from "lucide-react";

interface ChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeType: 'add' | 'edit' | 'delete';
  companyId: string;
  locationId: string;
  periodId: string;
  targetShiftId?: string;
  payloadBefore?: Record<string, any>;
  payloadAfter: Record<string, any>;
  shiftSummary?: string;
}

export const ChangeRequestDialog = ({
  open,
  onOpenChange,
  changeType,
  companyId,
  locationId,
  periodId,
  targetShiftId,
  payloadBefore,
  payloadAfter,
  shiftSummary,
}: ChangeRequestDialogProps) => {
  const [reasonCode, setReasonCode] = useState<string>("");
  const [note, setNote] = useState("");
  
  const createRequest = useCreateChangeRequest();

  const getActionLabel = () => {
    switch (changeType) {
      case 'add': return 'Add Shift';
      case 'edit': return 'Edit Shift';
      case 'delete': return 'Remove Shift';
    }
  };

  const handleSubmit = async () => {
    if (!reasonCode) return;
    
    await createRequest.mutateAsync({
      company_id: companyId,
      location_id: locationId,
      period_id: periodId,
      change_type: changeType,
      target_shift_id: targetShiftId,
      payload_before: payloadBefore || {},
      payload_after: payloadAfter,
      reason_code: reasonCode,
      note: note.trim() || undefined,
    });
    
    onOpenChange(false);
    setReasonCode("");
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Schedule Change Request
          </DialogTitle>
          <DialogDescription>
            This schedule is locked. Your change will be submitted for manager approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Change summary */}
          <div className="rounded-lg bg-muted p-3">
            <div className="text-sm font-medium mb-1">Requested Change</div>
            <div className="text-sm text-muted-foreground">
              <strong>{getActionLabel()}</strong>
              {shiftSummary && (
                <>
                  <br />
                  {shiftSummary}
                </>
              )}
            </div>
          </div>

          {/* Reason code */}
          <div className="space-y-2">
            <Label htmlFor="reason-code">Reason *</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger id="reason-code">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_CHANGE_REASON_CODES.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional notes */}
          <div className="space-y-2">
            <Label htmlFor="note">Additional Notes (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Provide any additional context for this change..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reasonCode || createRequest.isPending}
          >
            {createRequest.isPending ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
