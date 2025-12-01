import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePendingApprovals, useApproveShiftAssignment, useRejectShiftAssignment } from "@/hooks/useShiftAssignments";
import { format } from "date-fns";
import { Clock, MapPin, CheckCircle, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PendingApprovalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingApprovalsDialog({ open, onOpenChange }: PendingApprovalsDialogProps) {
  const { data: pendingApprovals, isLoading } = usePendingApprovals();
  const approveAssignment = useApproveShiftAssignment();
  const rejectAssignment = useRejectShiftAssignment();

  const handleApprove = async (assignmentId: string) => {
    await approveAssignment.mutateAsync(assignmentId);
  };

  const handleReject = async (assignmentId: string) => {
    await rejectAssignment.mutateAsync(assignmentId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pending Shift Approvals</DialogTitle>
          <DialogDescription>
            Review and approve employees requesting shifts with different roles
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !pendingApprovals || pendingApprovals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending approvals
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((assignment) => (
                <div
                  key={assignment.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {assignment.employees?.full_name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">
                          Employee: {assignment.employees?.role}
                        </Badge>
                        <span>→</span>
                        <Badge variant="outline">
                          Shift: {assignment.shifts?.role}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {assignment.shifts?.shift_date && 
                        format(new Date(assignment.shifts.shift_date), "MMM d, yyyy")}
                      {" "}
                      {assignment.shifts?.start_time} - {assignment.shifts?.end_time}
                    </div>
                    {assignment.shifts?.locations && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {assignment.shifts.locations.name}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(assignment.id)}
                      disabled={approveAssignment.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(assignment.id)}
                      disabled={rejectAssignment.isPending}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
