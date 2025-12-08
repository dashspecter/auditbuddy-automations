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
import { useStaffLocations, useAddStaffLocation, useRemoveStaffLocation } from "@/hooks/useStaffLocations";
import { RoleManagementDialog } from "@/components/workforce/RoleManagementDialog";
import { Settings, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

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
    location_id: "", // Primary location
    role: "",
    status: "active",
    email: "",
    phone: "",
    contract_type: "full-time",
    hire_date: "",
    base_salary: "",
    hourly_rate: "",
    overtime_rate: "",
    expected_weekly_hours: "",
    expected_shifts_per_week: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
    // ID Document fields
    localitate: "",
    serie_id: "",
    numar_id: "",
    valabilitate_id: "",
    cnp: "",
    // Additional contract fields
    domiciliu: "",
    emisa_de: "",
    valabila_de_la: "",
    ocupatia: "",
    cod_cor: "",
    valoare_tichet: "",
    perioada_proba_end: "",
  });
  const [additionalLocations, setAdditionalLocations] = useState<string[]>([]);
  const [selectedLocationToAdd, setSelectedLocationToAdd] = useState("");
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const { data: roles = [] } = useEmployeeRoles();
  const { data: staffLocations = [] } = useStaffLocations(employee?.id);
  const addStaffLocation = useAddStaffLocation();
  const removeStaffLocation = useRemoveStaffLocation();

  // Initialize form when dialog opens or employee changes
  useEffect(() => {
    if (!open) return; // Only run when dialog is open
    
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
        overtime_rate: employee.overtime_rate?.toString() || "",
        expected_weekly_hours: employee.expected_weekly_hours?.toString() || "",
        expected_shifts_per_week: employee.expected_shifts_per_week?.toString() || "",
        emergency_contact_name: employee.emergency_contact_name || "",
        emergency_contact_phone: employee.emergency_contact_phone || "",
        notes: employee.notes || "",
        // ID Document fields
        localitate: employee.localitate || "",
        serie_id: employee.serie_id || "",
        numar_id: employee.numar_id || "",
        valabilitate_id: employee.valabilitate_id || "",
        cnp: employee.cnp || "",
        // Additional contract fields
        domiciliu: employee.domiciliu || "",
        emisa_de: employee.emisa_de || "",
        valabila_de_la: employee.valabila_de_la || "",
        ocupatia: employee.ocupatia || "",
        cod_cor: employee.cod_cor || "",
        valoare_tichet: employee.valoare_tichet?.toString() || "",
        perioada_proba_end: employee.perioada_proba_end || "",
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
        overtime_rate: "",
        expected_weekly_hours: "",
        expected_shifts_per_week: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        notes: "",
        // ID Document fields
        localitate: "",
        serie_id: "",
        numar_id: "",
        valabilitate_id: "",
        cnp: "",
        // Additional contract fields
        domiciliu: "",
        emisa_de: "",
        valabila_de_la: "",
        ocupatia: "",
        cod_cor: "",
        valoare_tichet: "",
        perioada_proba_end: "",
      });
      setAdditionalLocations([]);
    }
    setSelectedLocationToAdd("");
    setCreateUserAccount(false);
  }, [employee, open]);

  // Separate effect for loading additional locations (only when editing)
  useEffect(() => {
    if (employee && staffLocations.length > 0) {
      const additionalLocs = staffLocations
        .filter(sl => !sl.is_primary && sl.location_id !== employee.location_id)
        .map(sl => sl.location_id);
      setAdditionalLocations(additionalLocs);
    }
  }, [employee, staffLocations]);

  const handleAddLocation = () => {
    if (selectedLocationToAdd && !additionalLocations.includes(selectedLocationToAdd) && selectedLocationToAdd !== formData.location_id) {
      setAdditionalLocations([...additionalLocations, selectedLocationToAdd]);
      setSelectedLocationToAdd("");
    }
  };

  const handleRemoveAdditionalLocation = (locationId: string) => {
    setAdditionalLocations(additionalLocations.filter(id => id !== locationId));
  };

  const getLocationName = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || locationId;
  };

  const availableLocationsToAdd = locations.filter(
    l => l.id !== formData.location_id && !additionalLocations.includes(l.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      base_salary: formData.base_salary ? parseFloat(formData.base_salary) : null,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      overtime_rate: formData.overtime_rate ? parseFloat(formData.overtime_rate) : null,
      expected_weekly_hours: formData.expected_weekly_hours ? parseFloat(formData.expected_weekly_hours) : null,
      expected_shifts_per_week: formData.expected_shifts_per_week ? parseInt(formData.expected_shifts_per_week) : null,
      email: formData.email || null,
      phone: formData.phone || null,
      hire_date: formData.hire_date || null,
      emergency_contact_name: formData.emergency_contact_name || null,
      emergency_contact_phone: formData.emergency_contact_phone || null,
      notes: formData.notes || null,
      avatar_url: null,
      user_id: employee?.user_id || null,
      // ID Document fields
      localitate: formData.localitate || null,
      serie_id: formData.serie_id || null,
      numar_id: formData.numar_id || null,
      valabilitate_id: formData.valabilitate_id || null,
      cnp: formData.cnp || null,
      // Additional contract fields
      domiciliu: formData.domiciliu || null,
      emisa_de: formData.emisa_de || null,
      valabila_de_la: formData.valabila_de_la || null,
      ocupatia: formData.ocupatia || null,
      cod_cor: formData.cod_cor || null,
      valoare_tichet: formData.valoare_tichet ? parseFloat(formData.valoare_tichet) : null,
      perioada_proba_end: formData.perioada_proba_end || null,
    };
    
    let employeeId: string;
    
    if (employee) {
      await updateEmployee.mutateAsync({ id: employee.id, ...submitData });
      employeeId = employee.id;
      
      // Sync additional locations for existing employee
      const currentAdditionalLocs = staffLocations
        .filter(sl => !sl.is_primary && sl.location_id !== formData.location_id)
        .map(sl => ({ id: sl.id, location_id: sl.location_id }));
      
      // Remove locations that are no longer selected
      for (const loc of currentAdditionalLocs) {
        if (!additionalLocations.includes(loc.location_id)) {
          await removeStaffLocation.mutateAsync(loc.id);
        }
      }
      
      // Add new locations
      for (const locId of additionalLocations) {
        const exists = currentAdditionalLocs.some(l => l.location_id === locId);
        if (!exists) {
          await addStaffLocation.mutateAsync({
            staffId: employeeId,
            locationId: locId,
            isPrimary: false
          });
        }
      }
    } else {
      const newEmployee = await createEmployee.mutateAsync(submitData);
      employeeId = newEmployee?.id;
      
      // Add additional locations for new employee
      if (employeeId && additionalLocations.length > 0) {
        for (const locId of additionalLocations) {
          await addStaffLocation.mutateAsync({
            staffId: employeeId,
            locationId: locId,
            isPrimary: false
          });
        }
      }
      
      // If create user account is checked and email is provided, create auth user
      if (createUserAccount && formData.email && newEmployee) {
        try {
          const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
              email: formData.email,
              full_name: formData.full_name,
              employeeId: newEmployee.id
            }
          });
          
          if (error) {
            console.error("Failed to create user account:", error);
            toast.error("Employee created but failed to create login account");
          } else if (data?.error) {
            console.error("Failed to create user account:", data.error);
            toast.error(`Employee created but failed to create login account: ${data.error}`);
          } else {
            toast.success("Employee created with login credentials!");
          }
        } catch (err) {
          console.error("Error creating user:", err);
          toast.error("Employee created but failed to create login account");
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

          {/* Contract Document Section */}
          <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
            <h3 className="font-medium text-sm text-foreground">Date Contract / Buletin</h3>
            
            {/* Personal Identification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cnp">CNP</Label>
                <Input
                  id="cnp"
                  value={formData.cnp}
                  onChange={(e) => setFormData({ ...formData, cnp: e.target.value })}
                  placeholder="e.g., 1234567890123"
                />
              </div>
              <div>
                <Label htmlFor="domiciliu">Domiciliu</Label>
                <Input
                  id="domiciliu"
                  value={formData.domiciliu}
                  onChange={(e) => setFormData({ ...formData, domiciliu: e.target.value })}
                  placeholder="Adresa completă"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="emisa_de">Emisă de</Label>
              <Input
                id="emisa_de"
                value={formData.emisa_de}
                onChange={(e) => setFormData({ ...formData, emisa_de: e.target.value })}
                placeholder="e.g., SPCEP Sector 1"
              />
            </div>

            {/* ID Card Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="serie_id">Serie CI</Label>
                <Input
                  id="serie_id"
                  value={formData.serie_id}
                  onChange={(e) => setFormData({ ...formData, serie_id: e.target.value })}
                  placeholder="e.g., XY"
                />
              </div>
              <div>
                <Label htmlFor="numar_id">Număr CI</Label>
                <Input
                  id="numar_id"
                  value={formData.numar_id}
                  onChange={(e) => setFormData({ ...formData, numar_id: e.target.value })}
                  placeholder="e.g., 123456"
                />
              </div>
              <div>
                <Label htmlFor="valabila_de_la">Valabilă de la</Label>
                <Input
                  id="valabila_de_la"
                  type="date"
                  value={formData.valabila_de_la}
                  onChange={(e) => setFormData({ ...formData, valabila_de_la: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="valabilitate_id">Până la</Label>
                <Input
                  id="valabilitate_id"
                  type="date"
                  value={formData.valabilitate_id}
                  onChange={(e) => setFormData({ ...formData, valabilitate_id: e.target.value })}
                />
              </div>
            </div>

            {/* Job Details for Contract */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ocupatia">Ocupația</Label>
                <Input
                  id="ocupatia"
                  value={formData.ocupatia}
                  onChange={(e) => setFormData({ ...formData, ocupatia: e.target.value })}
                  placeholder="e.g., Ospătar"
                />
              </div>
              <div>
                <Label htmlFor="cod_cor">Cod COR</Label>
                <Input
                  id="cod_cor"
                  value={formData.cod_cor}
                  onChange={(e) => setFormData({ ...formData, cod_cor: e.target.value })}
                  placeholder="e.g., 513102"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valoare_tichet">Valoare Tichet Masă (lei/zi)</Label>
                <Input
                  id="valoare_tichet"
                  type="number"
                  step="0.01"
                  value={formData.valoare_tichet}
                  onChange={(e) => setFormData({ ...formData, valoare_tichet: e.target.value })}
                  placeholder="e.g., 40"
                />
              </div>
              <div>
                <Label htmlFor="perioada_proba_end">Sfârșit Perioadă Probă</Label>
                <Input
                  id="perioada_proba_end"
                  type="date"
                  value={formData.perioada_proba_end}
                  onChange={(e) => setFormData({ ...formData, perioada_proba_end: e.target.value })}
                />
              </div>
            </div>
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

            <div>
              <Label htmlFor="overtime_rate">Overtime Rate (Extra Shifts)</Label>
              <Input
                id="overtime_rate"
                type="number"
                step="0.01"
                value={formData.overtime_rate}
                onChange={(e) => setFormData({ ...formData, overtime_rate: e.target.value })}
                placeholder="Per hour for extra shifts"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expected_weekly_hours">Expected Weekly Hours</Label>
              <Input
                id="expected_weekly_hours"
                type="number"
                step="0.5"
                value={formData.expected_weekly_hours}
                onChange={(e) => setFormData({ ...formData, expected_weekly_hours: e.target.value })}
                placeholder="e.g. 40"
              />
            </div>

            <div>
              <Label htmlFor="expected_shifts_per_week">Expected Shifts/Week</Label>
              <Input
                id="expected_shifts_per_week"
                type="number"
                step="1"
                value={formData.expected_shifts_per_week}
                onChange={(e) => setFormData({ ...formData, expected_shifts_per_week: e.target.value })}
                placeholder="e.g. 5"
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

          <div className="space-y-3">
            <Label htmlFor="location">Primary Location</Label>
            <Select
              value={formData.location_id}
              onValueChange={(value) => {
                setFormData({ ...formData, location_id: value });
                // Remove from additional locations if it was there
                setAdditionalLocations(additionalLocations.filter(id => id !== value));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select primary location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Additional Locations */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Additional Locations</Label>
              
              {additionalLocations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {additionalLocations.map(locId => (
                    <Badge key={locId} variant="secondary" className="flex items-center gap-1">
                      {getLocationName(locId)}
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalLocation(locId)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {availableLocationsToAdd.length > 0 && (
                <div className="flex gap-2">
                  <Select
                    value={selectedLocationToAdd}
                    onValueChange={setSelectedLocationToAdd}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add another location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLocationsToAdd.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddLocation}
                    disabled={!selectedLocationToAdd}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
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
