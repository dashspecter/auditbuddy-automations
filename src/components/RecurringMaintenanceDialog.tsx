import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocations } from "@/hooks/useLocations";
import { useEquipment } from "@/hooks/useEquipment";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateRecurringMaintenanceSchedule, useUpdateRecurringMaintenanceSchedule } from "@/hooks/useRecurringMaintenanceSchedules";
import { format } from "date-fns";

interface RecurringMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: any;
}

export const RecurringMaintenanceDialog = ({ open, onOpenChange, schedule }: RecurringMaintenanceDialogProps) => {
  const [formData, setFormData] = useState({
    equipment_id: "",
    location_id: "",
    title: "",
    description: "",
    recurrence_pattern: "monthly" as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    day_of_week: 1,
    day_of_month: 1,
    start_time: "09:00",
    assigned_user_id: "",
    supervisor_user_id: "",
    is_active: true,
  });

  const { data: locations } = useLocations();
  const { data: equipment } = useEquipment(formData.location_id);
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useCreateRecurringMaintenanceSchedule();
  const updateMutation = useUpdateRecurringMaintenanceSchedule();

  useEffect(() => {
    if (schedule) {
      setFormData({
        equipment_id: schedule.equipment_id,
        location_id: schedule.location_id,
        title: schedule.title,
        description: schedule.description || "",
        recurrence_pattern: schedule.recurrence_pattern,
        start_date: schedule.start_date,
        end_date: schedule.end_date || "",
        day_of_week: schedule.day_of_week || 1,
        day_of_month: schedule.day_of_month || 1,
        start_time: schedule.start_time,
        assigned_user_id: schedule.assigned_user_id,
        supervisor_user_id: schedule.supervisor_user_id || "",
        is_active: schedule.is_active,
      });
    } else {
      setFormData({
        equipment_id: "",
        location_id: "",
        title: "",
        description: "",
        recurrence_pattern: "monthly",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: "",
        day_of_week: 1,
        day_of_month: 1,
        start_time: "09:00",
        assigned_user_id: "",
        supervisor_user_id: "",
        is_active: true,
      });
    }
  }, [schedule, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      supervisor_user_id: formData.supervisor_user_id || null,
      end_date: formData.end_date || null,
      day_of_week: formData.recurrence_pattern === "weekly" ? formData.day_of_week : null,
      day_of_month: formData.recurrence_pattern === "monthly" ? formData.day_of_month : null,
    };

    if (schedule) {
      updateMutation.mutate({ id: schedule.id, ...submitData }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit" : "Create"} Recurring Maintenance Schedule</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location_id">Location *</Label>
            <Select
              value={formData.location_id}
              onValueChange={(value) => setFormData({ ...formData, location_id: value, equipment_id: "" })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipment_id">Equipment *</Label>
            <Select
              value={formData.equipment_id}
              onValueChange={(value) => setFormData({ ...formData, equipment_id: value })}
              required
              disabled={!formData.location_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent>
                {equipment?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Monthly Safety Check"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What needs to be checked or maintained"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recurrence_pattern">Frequency *</Label>
              <Select
                value={formData.recurrence_pattern}
                onValueChange={(value: any) => setFormData({ ...formData, recurrence_pattern: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_time">Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
          </div>

          {formData.recurrence_pattern === "weekly" && (
            <div className="space-y-2">
              <Label htmlFor="day_of_week">Day of Week *</Label>
              <Select
                value={formData.day_of_week.toString()}
                onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.recurrence_pattern === "monthly" && (
            <div className="space-y-2">
              <Label htmlFor="day_of_month">Day of Month *</Label>
              <Input
                id="day_of_month"
                type="number"
                min="1"
                max="31"
                value={formData.day_of_month}
                onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_user_id">Assigned To *</Label>
            <Select
              value={formData.assigned_user_id}
              onValueChange={(value) => setFormData({ ...formData, assigned_user_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supervisor_user_id">Supervisor (Optional)</Label>
            <Select
              value={formData.supervisor_user_id}
              onValueChange={(value) => setFormData({ ...formData, supervisor_user_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {schedule ? "Update" : "Create"} Schedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
