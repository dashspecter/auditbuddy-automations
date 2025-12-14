import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, DollarSign, UserPlus, CalendarPlus, Briefcase, ChevronRight, AlertTriangle, BarChart, CalendarClock } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { ModuleGate } from "@/components/ModuleGate";
import { useEmployees } from "@/hooks/useEmployees";
import { RoleManagementDialog } from "@/components/workforce/RoleManagementDialog";
import { useState, useEffect } from "react";
import { WorkforceGuides } from "@/components/workforce/WorkforceGuides";
import { Card, CardContent } from "@/components/ui/card";

const workforceSubItems = [
  { title: "Staff", url: "/workforce/staff", icon: Users, description: "Manage employees" },
  { title: "Shifts", url: "/workforce/shifts", icon: Calendar, description: "Schedule shifts" },
  { title: "Attendance", url: "/workforce/attendance", icon: Clock, description: "Track attendance" },
  { title: "Time Off", url: "/workforce/time-off", icon: CalendarClock, description: "Manage leave requests" },
  { title: "Payroll", url: "/workforce/payroll", icon: DollarSign, description: "Process payroll" },
  { title: "Payroll Batches", url: "/workforce/payroll-batches", icon: DollarSign, description: "Manage batches" },
  { title: "Attendance Alerts", url: "/workforce/attendance-alerts", icon: AlertTriangle, description: "View alerts" },
  { title: "Scheduling Insights", url: "/workforce/scheduling-insights", icon: BarChart, description: "Analytics" },
];

const Workforce = () => {
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
          <p className="text-muted-foreground">Loading workforce data...</p>
        </div>
      </div>
    );
  }

  return (
    <ModuleGate module="workforce">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Workforce Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team, schedules, and payroll in one place
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => setRoleDialogOpen(true)}>
              <Briefcase className="h-4 w-4" />
              Manage Roles
            </Button>
            <Link to="/workforce/staff" className="w-full sm:w-auto">
              <Button className="gap-2 w-full">
                <UserPlus className="h-4 w-4" />
                Add Staff Member
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
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">{item.description}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <WorkforceGuides />
      </div>
      <RoleManagementDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} />
    </ModuleGate>
  );
};

export default Workforce;