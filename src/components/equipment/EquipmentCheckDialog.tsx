import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateEquipmentCheck } from "@/hooks/useEquipmentChecks";
import { supabase } from "@/integrations/supabase/client";

interface EquipmentCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
}

export const EquipmentCheckDialog = ({
  open,
  onOpenChange,
  equipmentId,
}: EquipmentCheckDialogProps) => {
  const [formData, setFormData] = useState({
    check_date: new Date().toISOString().split('T')[0],
    notes: "",
    result_status: "passed",
  });

  const createCheck = useCreateEquipmentCheck();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await createCheck.mutateAsync({
      equipment_id: equipmentId,
      performed_by: user.id,
      ...formData,
    });
    
    onOpenChange(false);
    setFormData({
      check_date: new Date().toISOString().split('T')[0],
      notes: "",
      result_status: "passed",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Equipment Check</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="check_date">Check Date</Label>
            <Input
              id="check_date"
              type="date"
              value={formData.check_date}
              onChange={(e) => setFormData({ ...formData, check_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="result_status">Result</Label>
            <Select
              value={formData.result_status}
              onValueChange={(value) => setFormData({ ...formData, result_status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="needs_attention">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any observations or issues found..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCheck.isPending}>
              Log Check
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
