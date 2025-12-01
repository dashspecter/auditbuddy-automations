import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Briefcase } from "lucide-react";
import { useEmployeeRoles, useCreateEmployeeRole, useUpdateEmployeeRole, useDeleteEmployeeRole } from "@/hooks/useEmployeeRoles";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface RoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleManagementDialog({ open, onOpenChange }: RoleManagementDialogProps) {
  const { data: roles = [], isLoading } = useEmployeeRoles();
  const createRole = useCreateEmployeeRole();
  const updateRole = useUpdateEmployeeRole();
  const deleteRole = useDeleteEmployeeRole();

  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    department: "General",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRole) {
      await updateRole.mutateAsync({ id: editingRole, ...formData });
      setEditingRole(null);
    } else {
      await createRole.mutateAsync(formData);
    }
    
    setFormData({ name: "", description: "", color: "#6366f1", department: "General" });
  };

  const handleEdit = (role: any) => {
    setEditingRole(role.id);
    setFormData({
      name: role.name,
      description: role.description || "",
      color: role.color,
      department: role.department || "General",
    });
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setFormData({ name: "", description: "", color: "#6366f1", department: "General" });
  };

  const handleDelete = async () => {
    if (deletingRole) {
      await deleteRole.mutateAsync(deletingRole);
      setDeletingRole(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Manage Employee Roles
            </DialogTitle>
            <DialogDescription>
              Create and manage custom roles for your employees
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Add/Edit Role Form */}
            <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold text-sm">
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Server, Manager"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g., Kitchen, Front of House"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this role"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                  {editingRole ? (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      Update Role
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Role
                    </>
                  )}
                </Button>
                {editingRole && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>

            {/* Existing Roles List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Existing Roles ({roles.length})</h3>
              
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading roles...</p>
              ) : roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles created yet.</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{role.name}</p>
                            <Badge variant="secondary" className="text-xs">
                              {role.department}
                            </Badge>
                          </div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(role)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingRole(role.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRole} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
              Employees with this role will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
