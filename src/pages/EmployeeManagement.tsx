import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, KeyRound, FileText, Upload, UserX, UserCheck } from "lucide-react";
import { useEmployees, useDeleteEmployee, useUpdateEmployee } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { ContractTemplateDialog } from "@/components/ContractTemplateDialog";
import { GenerateContractDialog } from "@/components/GenerateContractDialog";
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
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [filterLocationId, setFilterLocationId] = useState<string>("__all__");
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [employeeForContract, setEmployeeForContract] = useState<any>(null);
  const [employeeToResetPassword, setEmployeeToResetPassword] = useState<any>(null);

  const { data: employees, isLoading } = useEmployees(
    filterLocationId === "__all__" ? undefined : filterLocationId
  );
  const { data: locations } = useLocations();
  const { data: audits, isLoading: auditsLoading } = useStaffAudits();
  const deleteEmployee = useDeleteEmployee();
  const updateEmployee = useUpdateEmployee();

  const handleToggleStatus = (employee: any) => {
    const newStatus = employee.status === "active" ? "inactive" : "active";
    updateEmployee.mutate({
      id: employee.id,
      status: newStatus
    });
  };

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

  const handleGenerateContract = (employee: any) => {
    setEmployeeForContract(employee);
    setContractDialogOpen(true);
  };

  const handleCreateAccount = async (employee: any) => {
    if (!employee.email) {
      toast.error(t('workforce.employees.mustHaveEmail'));
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error(t('auth.mustBeLoggedIn'));
        return;
      }

      const { error } = await supabase.functions.invoke('create-user', {
        body: {
          email: employee.email,
          full_name: employee.full_name,
          employeeId: employee.id
        }
      });

      if (error) throw error;

      toast.success(t('workforce.employees.accountCreated', { name: employee.full_name }));
      
      // Refresh the employees list
      window.location.reload();
    } catch (error: any) {
      console.error('Create account error:', error);
      toast.error(error.message || t('workforce.employees.failedCreateAccount'));
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('workforce.employees.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('workforce.employees.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {t('workforce.employees.uploadTemplate')}
            </Button>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              {t('workforce.employees.addEmployee')}
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <LocationSelector
              value={filterLocationId}
              onValueChange={setFilterLocationId}
              placeholder={t('workforce.attendance.allLocations')}
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
              <p className="text-muted-foreground">{t('workforce.employees.noEmployees')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('workforce.employees.name')}</TableHead>
                  <TableHead>{t('workforce.employees.location')}</TableHead>
                  <TableHead>{t('workforce.employees.role')}</TableHead>
                  <TableHead>{t('workforce.employees.status')}</TableHead>
                  <TableHead className="text-right">{t('workforce.employees.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  // Check if employee has additional locations beyond primary
                  const additionalLocationsCount = employee.staff_locations?.length || 0;
                  const hasMultipleLocations = additionalLocationsCount > 0;
                  const totalLocationsCount = additionalLocationsCount + 1; // +1 for primary
                  
                  return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.full_name}</TableCell>
                    <TableCell>
                      {hasMultipleLocations ? (
                        <Badge variant="secondary" className="text-xs">
                          {t('workforce.employees.allLocationsCount', { count: totalLocationsCount })}
                        </Badge>
                      ) : (
                        employee.locations?.name || '-'
                      )}
                    </TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell>
                      <Badge
                        variant={employee.status === "active" ? "default" : "secondary"}
                      >
                        {t(`workforce.employees.statuses.${employee.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {employee.user_id ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResetPassword(employee)}
                            title={t('workforce.employees.resetPassword')}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        ) : employee.email ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateAccount(employee)}
                            title={t('workforce.employees.createLoginAccount')}
                            className="text-xs"
                          >
                            <KeyRound className="h-4 w-4 mr-1" />
                            {t('workforce.employees.createAccount')}
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleGenerateContract(employee)}
                          title={t('workforce.employees.generateContract')}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(employee)}
                          title={employee.status === "active" ? t('workforce.employees.deactivate') : t('workforce.employees.activate')}
                        >
                          {employee.status === "active" ? (
                            <UserX className="h-4 w-4 text-destructive" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('workforce.employees.performanceRecords')}</CardTitle>
            <CardDescription>
              {t('workforce.employees.performanceDesc')}
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
                {t('workforce.employees.noPerformanceRecords')}
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
              <AlertDialogTitle>{t('workforce.employees.deleteEmployee')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('workforce.employees.deleteConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>{t('common.delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ResetPasswordDialog
          open={resetPasswordDialogOpen}
          onOpenChange={setResetPasswordDialogOpen}
          employee={employeeToResetPassword}
        />

        <ContractTemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          onTemplateUploaded={() => {}}
        />

        <GenerateContractDialog
          open={contractDialogOpen}
          onOpenChange={setContractDialogOpen}
          employee={employeeForContract}
        />
      </div>
  );
}
