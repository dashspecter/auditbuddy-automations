import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompanyCheckers, useTemplateCheckers, useAssignCheckers, CheckerOption } from "@/hooks/useTemplateCheckers";
import { toast } from "sonner";
import { Users, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  companyId: string;
}

export function AssignCheckersDialog({ open, onOpenChange, templateId, templateName, companyId }: Props) {
  const { data: checkers = [], isLoading: checkersLoading } = useCompanyCheckers(companyId);
  const { data: currentAssignments = [], isLoading: assignmentsLoading } = useTemplateCheckers(templateId);
  const assignMutation = useAssignCheckers();

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Initialize selection from current assignments
  useEffect(() => {
    if (currentAssignments.length > 0) {
      setSelectedUsers(currentAssignments.map(a => a.user_id));
    } else {
      setSelectedUsers([]);
    }
  }, [currentAssignments]);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    try {
      await assignMutation.mutateAsync({ templateId, userIds: selectedUsers });
      toast.success(`Checkers assigned to "${templateName}"`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error assigning checkers:", error);
      toast.error("Failed to assign checkers");
    }
  };

  const isLoading = checkersLoading || assignmentsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Checkers
          </DialogTitle>
          <DialogDescription>
            Select which checkers can use the template "{templateName}". Only assigned checkers will see this template.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : checkers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No employees with user accounts found.</p>
            <p className="text-sm">Create user accounts for employees first.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-2">
              {checkers.map((checker) => (
                <label
                  key={checker.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedUsers.includes(checker.user_id)}
                    onCheckedChange={() => toggleUser(checker.user_id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{checker.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground truncate">{checker.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={assignMutation.isPending || isLoading}
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              `Save (${selectedUsers.length} selected)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
