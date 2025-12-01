import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { useEmployees, useDeleteEmployee } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmployeeDialog } from "@/components/EmployeeDialog";
import { ResetPasswordDialog } from "@/components/ResetPasswordDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationSelector } from "@/components/LocationSelector";

export default function EmployeeManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [filterLocationId, setFilterLocationId] = useState<string>("__all__");
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [employeeToResetPassword, setEmployeeToResetPassword] = useState<any>(null);

  const { data: employees, isLoading } = useEmployees(
    filterLocationId === "__all__" ? undefined : filterLocationId
  );
  const { data: locations } = useLocations();
  const { data: audits, isLoading: auditsLoading } = useStaffAudits();
  const deleteEmployee = useDeleteEmployee();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleEdit = (employee: any) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setEmployeeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
      deleteEmployee.mutate(employeeToDelete);
    }
    setDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

  const handleAddNew = () => {
    setSelectedEmployee(null);
    setDialogOpen(true);
  };

  const handleResetPassword = (employee: any) => {
    setEmployeeToResetPassword(employee);
    setResetPasswordDialogOpen(true);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage employees across all locations
            </p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <LocationSelector
              value={filterLocationId}
              onValueChange={setFilterLocationId}
              placeholder="All Locations"
              allowAll
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !employees || employees.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No employees found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.full_name}</TableCell>
                    <TableCell>{employee.locations?.name}</TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell>
                      <Badge
                        variant={employee.status === "active" ? "default" : "secondary"}
                      >
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {employee.user_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResetPassword(employee)}
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(employee)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(employee.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Staff Performance Records</CardTitle>
            <CardDescription>
              Complete history of all staff performance audits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : audits && audits.length > 0 ? (
              <div className="space-y-3">
                {audits.map((audit) => (
                  <div
                    key={audit.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">
                          {audit.employees?.full_name}
                        </h3>
                        <Badge variant="outline">{audit.employees?.role}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{audit.locations?.name}</span>
                        <span>•</span>
                        <span>{format(new Date(audit.audit_date), "MMM dd, yyyy")}</span>
                      </div>
                      {audit.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {audit.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getScoreColor(audit.score)}>
                        {audit.score}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No staff performance records found.
              </div>
            )}
          </CardContent>
        </Card>

        <EmployeeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employee={selectedEmployee}
          locations={locations || []}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this employee? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ResetPasswordDialog
          open={resetPasswordDialogOpen}
          onOpenChange={setResetPasswordDialogOpen}
          employee={employeeToResetPassword}
        />
      </div>
  );
}
