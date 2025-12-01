import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateShift, useUpdateShift } from "@/hooks/useShifts";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { useLocations } from "@/hooks/useLocations";

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: any;
  defaultDate?: Date;
}

export const ShiftDialog = ({
  open,
  onOpenChange,
  shift,
  defaultDate,
}: ShiftDialogProps) => {
  const [formData, setFormData] = useState({
    location_id: "",
    shift_date: "",
    start_time: "",
    end_time: "",
    role: "",
    required_count: "1",
    notes: "",
  });

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const { data: roles = [] } = useEmployeeRoles();
  const { data: locations = [] } = useLocations();

  useEffect(() => {
    if (shift) {
      setFormData({
        location_id: shift.location_id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        role: shift.role,
        required_count: shift.required_count.toString(),
        notes: shift.notes || "",
      });
    } else {
      const dateStr = defaultDate ? defaultDate.toISOString().split('T')[0] : "";
      setFormData({
        location_id: "",
        shift_date: dateStr,
        start_time: "09:00",
        end_time: "17:00",
        role: "",
        required_count: "1",
        notes: "",
      });
    }
  }, [shift, defaultDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      required_count: parseInt(formData.required_count),
      notes: formData.notes || null,
    };

    if (shift) {
      await updateShift.mutateAsync({ id: shift.id, ...submitData });
    } else {
      await createShift.mutateAsync(submitData);
    }
    
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {shift ? "Edit Shift" : "Create Shift"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_id">Location *</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, location_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift_date">Date *</Label>
                <Input
                  id="shift_date"
                  type="date"
                  value={formData.shift_date}
                  onChange={(e) =>
                    setFormData({ ...formData, shift_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role Required *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="required_count">Staff Needed *</Label>
                <Input
                  id="required_count"
                  type="number"
                  min="1"
                  value={formData.required_count}
                  onChange={(e) =>
                    setFormData({ ...formData, required_count: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add any additional notes about this shift..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createShift.isPending || updateShift.isPending}
              >
                {shift ? "Update" : "Create"} Shift
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
