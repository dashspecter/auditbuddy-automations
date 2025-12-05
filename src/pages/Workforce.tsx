import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, DollarSign, UserPlus, CalendarPlus, Briefcase } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { ModuleGate } from "@/components/ModuleGate";
import { useEmployees } from "@/hooks/useEmployees";
import { RoleManagementDialog } from "@/components/workforce/RoleManagementDialog";
import { useState, useEffect } from "react";
import { WorkforceGuides } from "@/components/workforce/WorkforceGuides";

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Workforce Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team, schedules, and payroll in one place
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setRoleDialogOpen(true)}>
              <Briefcase className="h-4 w-4" />
              Manage Roles
            </Button>
            <Link to="/workforce/staff">
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Staff Member
              </Button>
            </Link>
          </div>
        </div>

        <WorkforceGuides />
      </div>
      <RoleManagementDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} />
    </ModuleGate>
  );
};

export default Workforce;