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
import { useCreateEmployee, useUpdateEmployee } from "@/hooks/useEmployees";

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  locations: any[];
}

export const EmployeeDialog = ({
  open,
  onOpenChange,
  employee,
  locations,
}: EmployeeDialogProps) => {
  const [formData, setFormData] = useState({
    full_name: "",
    location_id: "",
    role: "",
    status: "active",
  });

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name,
        location_id: employee.location_id,
        role: employee.role,
        status: employee.status,
      });
    } else {
      setFormData({
        full_name: "",
        location_id: "",
        role: "",
        status: "active",
      });
    }
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (employee) {
      await updateEmployee.mutateAsync({ id: employee.id, ...formData });
    } else {
      await createEmployee.mutateAsync(formData);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Select
              value={formData.location_id}
              onValueChange={(value) => setFormData({ ...formData, location_id: value })}
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

          <div>
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g., Server, Cook, Manager"
              required
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEmployee.isPending || updateEmployee.isPending}>
              {employee ? "Update" : "Add"} Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
