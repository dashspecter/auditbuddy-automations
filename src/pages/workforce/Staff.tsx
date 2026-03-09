import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Settings2, Info, Upload } from "lucide-react";
import { StaffTable } from "@/components/workforce/StaffTable";
import { EmployeeDialog } from "@/components/EmployeeDialog";
import { RoleManagementDialog } from "@/components/workforce/RoleManagementDialog";
import { useLocations } from "@/hooks/useLocations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const useEmployeeCapacity = () => {
  return useQuery({
    queryKey: ["employee-capacity"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!companyUser) return null;

      const { data: company } = await supabase
        .from('companies')
        .select('max_employees')
        .eq('id', companyUser.company_id)
        .single();

      const maxEmployees = (company as any)?.max_employees as number | null;
      if (maxEmployees == null) return null;

      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyUser.company_id);

      return { current: count ?? 0, max: maxEmployees };
    },
  });
};

const Staff = () => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false);
  const { data: locations } = useLocations();
  const { data: capacity } = useEmployeeCapacity();

  const atCapacity = capacity != null && capacity.current >= capacity.max;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('workforce.staff.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t('workforce.staff.subtitle')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          {capacity != null && (
            <Badge variant={atCapacity ? 'destructive' : 'secondary'} className="whitespace-nowrap">
              {capacity.current} / {capacity.max} employees
            </Badge>
          )}
          <Button variant="outline" className="gap-2" onClick={() => setIsRolesDialogOpen(true)}>
            <Settings2 className="h-4 w-4" />
            {t('workforce.staff.manageRoles')}
          </Button>
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)} disabled={atCapacity}>
            <UserPlus className="h-4 w-4" />
            {t('workforce.staff.addStaff')}
          </Button>
        </div>
      </div>

      {atCapacity && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Employee limit reached</AlertTitle>
          <AlertDescription>
            You've reached the maximum number of employees ({capacity?.max}). Contact your platform administrator to increase the limit.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t('workforce.staff.jobTitlesTitle')}</AlertTitle>
        <AlertDescription>
          <p className="text-sm text-muted-foreground">
            {t('workforce.staff.jobTitlesDescription')}
          </p>
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>{t('workforce.staff.allStaff')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffTable />
        </CardContent>
      </Card>

      <EmployeeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        locations={locations || []}
      />

      <RoleManagementDialog
        open={isRolesDialogOpen}
        onOpenChange={setIsRolesDialogOpen}
      />
    </div>
  );
};

export default Staff;