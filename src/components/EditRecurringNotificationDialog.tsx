import { useState } from "react";
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
import { format } from "date-fns";

interface EditRecurringNotificationDialogProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    target_roles: string[];
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
  
  const [title, setTitle] = useState(notification.title);
  const [message, setMessage] = useState(notification.message);
  const [type, setType] = useState<"info" | "success" | "warning" | "announcement">(notification.type as any);
  const [targetRoles, setTargetRoles] = useState<string[]>(notification.target_roles);
  const [recurrencePattern, setRecurrencePattern] = useState<"daily" | "weekly" | "monthly">(notification.recurrence_pattern as any);
  const [expiresAt, setExpiresAt] = useState(notification.expires_at ? notification.expires_at.slice(0, 16) : "");
  const [nextScheduledAt, setNextScheduledAt] = useState(notification.next_scheduled_at ? notification.next_scheduled_at.slice(0, 16) : "");
  const [auditId, setAuditId] = useState<string>(notification.audit_id || "");

  const handleRoleToggle = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
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
          target_roles: targetRoles,
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
    if (!title || !message || targetRoles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
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
            <Label>Target Roles *</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-checker"
                  checked={targetRoles.includes("checker")}
                  onCheckedChange={() => handleRoleToggle("checker")}
                />
                <Label htmlFor="edit-checker" className="cursor-pointer">
                  Checkers
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-manager"
                  checked={targetRoles.includes("manager")}
                  onCheckedChange={() => handleRoleToggle("manager")}
                />
                <Label htmlFor="edit-manager" className="cursor-pointer">
                  Managers
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-admin"
                  checked={targetRoles.includes("admin")}
                  onCheckedChange={() => handleRoleToggle("admin")}
                />
                <Label htmlFor="edit-admin" className="cursor-pointer">
                  Admins
                </Label>
              </div>
            </div>
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
