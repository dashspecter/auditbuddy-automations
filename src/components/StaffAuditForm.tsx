import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationSelector } from "@/components/LocationSelector";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateStaffAudit } from "@/hooks/useStaffAudits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface StaffAuditFormProps {
  onSuccess: () => void;
}

export const StaffAuditForm = ({ onSuccess }: StaffAuditFormProps) => {
  const [locationId, setLocationId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [score, setScore] = useState(70);
  const [notes, setNotes] = useState("");
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: employees } = useEmployees(locationId || undefined);
  const createAudit = useCreateStaffAudit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!locationId || !employeeId) return;

    await createAudit.mutateAsync({
      location_id: locationId,
      employee_id: employeeId,
      template_id: null,
      audit_date: auditDate,
      score,
      notes: notes || null,
      custom_data: null,
    });

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Location</Label>
        <LocationSelector
          value={locationId}
          onValueChange={setLocationId}
          placeholder="Select location"
        />
      </div>

      {locationId && (
        <div>
          <Label>Employee</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {!employees || employees.filter(e => e.status === "active").length === 0 ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  No active employees found for this location
                </div>
              ) : (
                employees.filter(e => e.status === "active").map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name} - {employee.role}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {locationId && (!employees || employees.filter(e => e.status === "active").length === 0) && (
            <p className="text-sm text-muted-foreground mt-1">
              Add employees for this location in the Employee Management page first.
            </p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="audit_date">Audit Date</Label>
        <Input
          id="audit_date"
          type="date"
          value={auditDate}
          onChange={(e) => setAuditDate(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Performance Score: {score}%</Label>
        <Slider
          value={[score]}
          onValueChange={([value]) => setScore(value)}
          min={0}
          max={100}
          step={5}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any observations or comments..."
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!locationId || !employeeId || createAudit.isPending}>
          Submit Audit
        </Button>
      </div>
    </form>
  );
};
