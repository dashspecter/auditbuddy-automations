import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from "@/hooks/useDepartments";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface DepartmentManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepartmentManagementDialog({ open, onOpenChange }: DepartmentManagementDialogProps) {
  const { data: departments = [], isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    display_order: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingDepartment) {
      await updateDepartment.mutateAsync({ id: editingDepartment, ...formData });
      setEditingDepartment(null);
    } else {
      await createDepartment.mutateAsync(formData);
    }
    
    setFormData({ name: "", description: "", color: "#6366f1", display_order: 0 });
  };

  const handleEdit = (dept: any) => {
    setEditingDepartment(dept.id);
    setFormData({
      name: dept.name,
      description: dept.description || "",
      color: dept.color,
      display_order: dept.display_order,
    });
  };

  const handleCancelEdit = () => {
    setEditingDepartment(null);
    setFormData({ name: "", description: "", color: "#6366f1", display_order: 0 });
  };

  const handleDelete = async () => {
    if (deletingDepartment) {
      await deleteDepartment.mutateAsync(deletingDepartment);
      setDeletingDepartment(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Manage Departments
            </DialogTitle>
            <DialogDescription>
              Create and manage departments to organize your employee roles
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Add/Edit Department Form */}
            <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold text-sm">
                {editingDepartment ? 'Edit Department' : 'Add New Department'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Department Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Kitchen, Front of House"
                    required
                  />
                </div>

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
                  placeholder="Brief description of this department"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  placeholder="0"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createDepartment.isPending || updateDepartment.isPending}>
                  {editingDepartment ? (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      Update Department
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Department
                    </>
                  )}
                </Button>
                {editingDepartment && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>

            {/* Existing Departments List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Existing Departments ({departments.length})</h3>
              
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading departments...</p>
              ) : departments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No departments created yet.</p>
              ) : (
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dept.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{dept.name}</p>
                          {dept.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {dept.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingDepartment(dept.id)}
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

      <AlertDialog open={!!deletingDepartment} onOpenChange={(open) => !open && setDeletingDepartment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this department? Roles in this department will be reassigned to General.
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
