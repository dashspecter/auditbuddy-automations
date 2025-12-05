import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocationAudits } from "@/hooks/useAudits";
import { useEmployees } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { X, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditRecurringNotificationDialogProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    target_roles: string[];
    target_employee_ids?: string[];
    recurrence_pattern: string;
    expires_at: string | null;
    scheduled_for: string | null;
    next_scheduled_at: string | null;
    audit_id?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditRecurringNotificationDialog = ({
  notification,
  open,
  onOpenChange,
}: EditRecurringNotificationDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: audits = [] } = useLocationAudits();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocations();
  
  const [title, setTitle] = useState(notification.title);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [message, setMessage] = useState(notification.message);
  const [type, setType] = useState<"info" | "success" | "warning" | "announcement">(notification.type as any);
  const [targetEmployeeIds, setTargetEmployeeIds] = useState<string[]>(notification.target_employee_ids || []);
  const [recurrencePattern, setRecurrencePattern] = useState<"daily" | "weekly" | "monthly">(notification.recurrence_pattern as any);
  const [expiresAt, setExpiresAt] = useState(notification.expires_at ? notification.expires_at.slice(0, 16) : "");
  const [nextScheduledAt, setNextScheduledAt] = useState(notification.next_scheduled_at ? notification.next_scheduled_at.slice(0, 16) : "");
  const [auditId, setAuditId] = useState<string>(notification.audit_id || "");

  // Reset form when notification changes
  useEffect(() => {
    setTitle(notification.title);
    setMessage(notification.message);
    setType(notification.type as any);
    setTargetEmployeeIds(notification.target_employee_ids || []);
    setRecurrencePattern(notification.recurrence_pattern as any);
    setExpiresAt(notification.expires_at ? notification.expires_at.slice(0, 16) : "");
    setNextScheduledAt(notification.next_scheduled_at ? notification.next_scheduled_at.slice(0, 16) : "");
    setAuditId(notification.audit_id || "");
  }, [notification]);

  const handleEmployeeToggle = (employeeId: string) => {
    setTargetEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({
          title,
          message,
          type,
          target_roles: [],
          target_employee_ids: targetEmployeeIds,
          recurrence_pattern: recurrencePattern,
          expires_at: expiresAt || null,
          next_scheduled_at: nextScheduledAt ? new Date(nextScheduledAt).toISOString() : null,
          audit_id: auditId || null,
        })
        .eq('id', notification.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notification updated",
        description: "The recurring notification has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring_notifications'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message || targetEmployeeIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and select at least one employee",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recurring Notification</DialogTitle>
          <DialogDescription>
            Update the content and schedule of this recurring notification.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-message">Message *</Label>
            <RichTextEditor value={message} onChange={setMessage} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-type">Notification Type</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-audit">Link to Audit (Optional)</Label>
            <Select value={auditId} onValueChange={setAuditId}>
              <SelectTrigger id="edit-audit">
                <SelectValue placeholder="Select an audit..." />
              </SelectTrigger>
              <SelectContent>
                {audits.map((audit) => (
                  <SelectItem key={audit.id} value={audit.id}>
                    {audit.location} - {format(new Date(audit.audit_date), 'MMM dd, yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Link this notification to a specific audit
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-recurrence">Recurrence Pattern *</Label>
            <Select value={recurrencePattern} onValueChange={(value: any) => setRecurrencePattern(value)}>
              <SelectTrigger id="edit-recurrence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-next-scheduled">Next Scheduled Time</Label>
            <Input
              id="edit-next-scheduled"
              type="datetime-local"
              value={nextScheduledAt}
              onChange={(e) => setNextScheduledAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              When the next notification instance will be created
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-expires">Expires At (Optional)</Label>
            <Input
              id="edit-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Target Employees *
            </Label>
            
            {/* Selected employees badges */}
            {targetEmployeeIds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
                {targetEmployeeIds.map((employeeId) => {
                  const employee = employees.find(e => e.id === employeeId);
                  return (
                    <Badge key={employeeId} variant="secondary" className="flex items-center gap-1">
                      {employee?.full_name || 'Unknown'}
                      <button
                        type="button"
                        onClick={() => handleEmployeeToggle(employeeId)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            
            {/* Location filter */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Employee selector */}
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
              {employees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No employees found</p>
              ) : (
                employees
                  .filter((employee) => locationFilter === "all" || employee.location_id === locationFilter)
                  .map((employee) => (
                    <div
                      key={employee.id}
                      className={cn(
                        "flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer",
                        targetEmployeeIds.includes(employee.id) && "bg-primary/10"
                      )}
                      onClick={() => handleEmployeeToggle(employee.id)}
                    >
                      <Checkbox
                        id={`edit-employee-${employee.id}`}
                        checked={targetEmployeeIds.includes(employee.id)}
                        onCheckedChange={() => handleEmployeeToggle(employee.id)}
                      />
                      <Label htmlFor={`edit-employee-${employee.id}`} className="cursor-pointer flex-1 flex items-center justify-between">
                        <span>{employee.full_name}</span>
                        <span className="text-xs text-muted-foreground">{employee.role} • {employee.locations?.name}</span>
                      </Label>
                    </div>
                  ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {targetEmployeeIds.length} employee{targetEmployeeIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Notification"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};