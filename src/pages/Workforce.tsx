import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Users, Calendar, Clock, DollarSign, UserPlus, Briefcase, AlertTriangle, BarChart, CalendarClock, GraduationCap } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { ModuleGate } from "@/components/ModuleGate";
import { useEmployees } from "@/hooks/useEmployees";
import { RoleManagementDialog } from "@/components/workforce/RoleManagementDialog";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

const workforceSubItems = [
  { titleKey: "workforce.subItems.staff", url: "/workforce/staff", icon: Users, descKey: "workforce.subItems.staffDesc" },
  { titleKey: "workforce.subItems.shifts", url: "/workforce/shifts", icon: Calendar, descKey: "workforce.subItems.shiftsDesc" },
  { titleKey: "workforce.subItems.training", url: "/workforce/training", icon: GraduationCap, descKey: "workforce.subItems.trainingDesc" },
  { titleKey: "workforce.subItems.attendance", url: "/workforce/attendance", icon: Clock, descKey: "workforce.subItems.attendanceDesc" },
  { titleKey: "workforce.subItems.timeOff", url: "/workforce/time-off", icon: CalendarClock, descKey: "workforce.subItems.timeOffDesc" },
  { titleKey: "workforce.subItems.payroll", url: "/workforce/payroll", icon: DollarSign, descKey: "workforce.subItems.payrollDesc" },
  { titleKey: "workforce.subItems.payrollBatches", url: "/workforce/payroll-batches", icon: DollarSign, descKey: "workforce.subItems.payrollBatchesDesc" },
  { titleKey: "workforce.subItems.attendanceAlerts", url: "/workforce/attendance-alerts", icon: AlertTriangle, descKey: "workforce.subItems.attendanceAlertsDesc" },
  { titleKey: "workforce.subItems.schedulingInsights", url: "/workforce/scheduling-insights", icon: BarChart, descKey: "workforce.subItems.schedulingInsightsDesc" },
  { titleKey: "workforce.subItems.warnings", url: "/workforce/warnings", icon: AlertTriangle, descKey: "workforce.subItems.warningsDesc" },
];

const Workforce = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasModule } = useCompanyContext();
  const { data: employees, isLoading } = useEmployees();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  // Check for action param to open dialogs
  useEffect(() => {
    if (searchParams.get('action') === 'roles') {
      setRoleDialogOpen(true);
      // Clear the param after opening
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <ModuleGate module="workforce">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('workforce.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('workforce.description')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => setRoleDialogOpen(true)}>
              <Briefcase className="h-4 w-4" />
              {t('workforce.manageRoles')}
            </Button>
            <Link to="/workforce/staff" className="w-full sm:w-auto">
              <Button className="gap-2 w-full">
                <UserPlus className="h-4 w-4" />
                {t('workforce.addStaffMember')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile-first quick navigation to subitems */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {workforceSubItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.url} to={item.url}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{t(item.titleKey)}</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">{t(item.descKey)}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
      <RoleManagementDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} />
    </ModuleGate>
  );
};

export default Workforce;