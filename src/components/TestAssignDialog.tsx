import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEmployees } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { useAssignTest } from "@/hooks/useTestAssignments";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationSelector } from "@/components/LocationSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface TestAssignDialogProps {
  testId: string;
  testTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TestAssignDialog = ({ testId, testTitle, open, onOpenChange }: TestAssignDialogProps) => {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [assignedLinks, setAssignedLinks] = useState<Array<{ employeeName: string; link: string }>>([]);
  const [showLinks, setShowLinks] = useState(false);
  
  const { data: locations } = useLocations();
  const { data: employees } = useEmployees(selectedLocation);
  const assignTest = useAssignTest();

  const handleToggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleAssign = async () => {
    if (selectedEmployees.size === 0) {
      return;
    }

    const result = await assignTest.mutateAsync({
      test_id: testId,
      employee_ids: Array.from(selectedEmployees),
    });

    // Generate links for each assignment
    const links = result.map((assignment: any) => {
      const employee = employees?.find(e => e.id === assignment.employee_id);
      return {
        employeeName: employee?.full_name || "Unknown",
        link: `${window.location.origin}/take-test/${testId}/${assignment.id}`
      };
    });

    setAssignedLinks(links);
    setShowLinks(true);
    setSelectedEmployees(new Set());
    setSelectedLocation("");
  };

  const copyLink = (link: string, name: string) => {
    navigator.clipboard.writeText(link);
    toast.success(`Link copied for ${name}!`);
  };

  const handleClose = () => {
    setShowLinks(false);
    setAssignedLinks([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showLinks ? "Assignment Links Created" : `Assign Test: ${testTitle}`}
          </DialogTitle>
        </DialogHeader>

        {showLinks ? (
          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Tests Assigned Successfully!</p>
                  <p className="text-sm text-muted-foreground">
                    Share these unique links with each employee. Their information will be automatically filled in.
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {assignedLinks.map((assignment, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-2">
                      <p className="font-medium">{assignment.employeeName}</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-muted px-3 py-2 rounded overflow-x-auto">
                          {assignment.link}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyLink(assignment.link, assignment.employeeName)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Location</Label>
              <LocationSelector
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              />
            </div>

            {selectedLocation && employees && (
              <div>
                <Label className="mb-2 block">Select Employees</Label>
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-2">
                    {employees.filter(e => e.status === "active").map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={employee.id}
                          checked={selectedEmployees.has(employee.id)}
                          onCheckedChange={() => handleToggleEmployee(employee.id)}
                        />
                        <label
                          htmlFor={employee.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {employee.full_name} - {employee.role}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {employees.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No active employees in this location
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={selectedEmployees.size === 0 || assignTest.isPending}
              >
                Assign to {selectedEmployees.size} Employee{selectedEmployees.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
