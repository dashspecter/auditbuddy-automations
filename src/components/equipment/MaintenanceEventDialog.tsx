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
import { useCreateMaintenanceEvent } from "@/hooks/useMaintenanceEvents";

interface MaintenanceEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
}

export const MaintenanceEventDialog = ({
  open,
  onOpenChange,
  equipmentId,
}: MaintenanceEventDialogProps) => {
  const [formData, setFormData] = useState({
    event_date: new Date().toISOString().split('T')[0],
    technician: "",
    description: "",
    cost: "",
    parts_used: "",
  });

  const createEvent = useCreateMaintenanceEvent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createEvent.mutateAsync({
      equipment_id: equipmentId,
      event_date: formData.event_date,
      technician: formData.technician,
      description: formData.description,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      parts_used: formData.parts_used ? JSON.parse(formData.parts_used) : null,
      attachments: null,
    });
    
    onOpenChange(false);
    setFormData({
      event_date: new Date().toISOString().split('T')[0],
      technician: "",
      description: "",
      cost: "",
      parts_used: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Maintenance Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="event_date">Date</Label>
            <Input
              id="event_date"
              type="date"
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="technician">Technician</Label>
            <Input
              id="technician"
              value={formData.technician}
              onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
              placeholder="Name of technician"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What work was performed..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="cost">Cost (optional)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              Log Maintenance
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
