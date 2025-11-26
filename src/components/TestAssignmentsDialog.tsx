import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useTestAssignments } from "@/hooks/useTestAssignments";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TestAssignmentsDialogProps {
  testId: string;
  testTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TestAssignmentsDialog = ({ testId, testTitle, open, onOpenChange }: TestAssignmentsDialogProps) => {
  const { data: assignments, isLoading } = useTestAssignments(testId);

  const copyLink = (shortCode: string, name: string) => {
    const link = `${window.location.origin}/t/${shortCode}`;
    navigator.clipboard.writeText(link);
    toast.success(`Link copied for ${name}!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Test Assignments - {testTitle}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading assignments...</p>
          </div>
        ) : !assignments || assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground mb-4">No employees assigned yet</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Total: {assignments.length} employee{assignments.length !== 1 ? 's' : ''}
              </p>
              <p className="text-muted-foreground">
                Completed: {assignments.filter(a => a.completed).length}
              </p>
            </div>

            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{assignment.employees?.full_name}</h4>
                          {assignment.completed ? (
                            <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Role: {assignment.employees?.role}</p>
                          <p>Location: {assignment.employees?.locations?.name}</p>
                          <p>Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}</p>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <code className="flex-1 text-xs bg-muted px-3 py-2 rounded overflow-x-auto">
                            {window.location.origin}/t/{(assignment as any).short_code}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyLink((assignment as any).short_code, assignment.employees?.full_name || "Employee")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
