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
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { RoleManagementDialog } from "@/components/workforce/RoleManagementDialog";
import { Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: any;
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
    email: "",
    phone: "",
    contract_type: "full-time",
    hire_date: "",
    base_salary: "",
    hourly_rate: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
  });
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const { data: roles = [] } = useEmployeeRoles();

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name,
        location_id: employee.location_id,
        role: employee.role,
        status: employee.status,
        email: employee.email || "",
        phone: employee.phone || "",
        contract_type: employee.contract_type || "full-time",
        hire_date: employee.hire_date || "",
        base_salary: employee.base_salary?.toString() || "",
        hourly_rate: employee.hourly_rate?.toString() || "",
        emergency_contact_name: employee.emergency_contact_name || "",
        emergency_contact_phone: employee.emergency_contact_phone || "",
        notes: employee.notes || "",
      });
    } else {
      setFormData({
        full_name: "",
        location_id: "",
        role: "",
        status: "active",
        email: "",
        phone: "",
        contract_type: "full-time",
        hire_date: "",
        base_salary: "",
        hourly_rate: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        notes: "",
      });
    }
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      base_salary: formData.base_salary ? parseFloat(formData.base_salary) : null,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      email: formData.email || null,
      phone: formData.phone || null,
      hire_date: formData.hire_date || null,
      emergency_contact_name: formData.emergency_contact_name || null,
      emergency_contact_phone: formData.emergency_contact_phone || null,
      notes: formData.notes || null,
      avatar_url: null,
    };
    
    if (employee) {
      await updateEmployee.mutateAsync({ id: employee.id, ...submitData });
    } else {
      const newEmployee = await createEmployee.mutateAsync(submitData);
      
      // If create user account is checked and email is provided, create auth user
      if (createUserAccount && formData.email && newEmployee) {
        try {
          const { data, error } = await supabase.rpc('create_employee_user', {
            employee_email: formData.email,
            employee_name: formData.full_name,
            employee_id: newEmployee.id
          });
          
          if (error) {
            console.error("Failed to create user account:", error);
            toast.error("Employee created but failed to create login account");
          } else {
            toast.success("Employee created with login credentials!");
          }
        } catch (err) {
          console.error("Error creating user:", err);
        }
      }
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contract_type">Contract Type</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="base_salary">Base Salary</Label>
              <Input
                id="base_salary"
                type="number"
                step="0.01"
                value={formData.base_salary}
                onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                placeholder="Annual salary"
              />
            </div>

            <div>
              <Label htmlFor="hourly_rate">Hourly Rate</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                placeholder="Per hour"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Emergency Contact</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              />
              <Input
                placeholder="Phone"
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information"
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
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="role">Role</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRoleDialogOpen(true)}
                className="h-auto p-1 text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                Manage Roles
              </Button>
            </div>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="z-50">
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      {role.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {!employee && formData.email && (
            <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
              <Checkbox 
                id="createUserAccount" 
                checked={createUserAccount}
                onCheckedChange={(checked) => setCreateUserAccount(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="createUserAccount"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Create login account for employee
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow this employee to log in and view their shifts
                </p>
              </div>
            </div>
          )}

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
      <RoleManagementDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} />
    </Dialog>
  );
}
