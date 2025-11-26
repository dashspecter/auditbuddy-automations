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

interface TestAssignDialogProps {
  testId: string;
  testTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TestAssignDialog = ({ testId, testTitle, open, onOpenChange }: TestAssignDialogProps) => {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  
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

    await assignTest.mutateAsync({
      test_id: testId,
      employee_ids: Array.from(selectedEmployees),
    });

    setSelectedEmployees(new Set());
    setSelectedLocation("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Test: {testTitle}</DialogTitle>
        </DialogHeader>

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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
      </DialogContent>
    </Dialog>
  );
};
