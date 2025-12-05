import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, DollarSign, UserPlus, CalendarPlus, Briefcase, BookOpen, LayoutDashboard } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { ModuleGate } from "@/components/ModuleGate";
import { useEmployees } from "@/hooks/useEmployees";
import { EmptyState } from "@/components/EmptyState";
import { RoleManagementDialog } from "@/components/workforce/RoleManagementDialog";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const modules = [
    {
      title: "Staff Management",
      description: "Manage your team members, roles, and information",
      icon: Users,
      link: "/workforce/staff",
      action: "View Staff",
    },
    {
      title: "Shift Scheduling",
      description: "Create and manage shifts across all locations",
      icon: Calendar,
      link: "/workforce/shifts",
      action: "View Shifts",
    },
    {
      title: "Attendance Tracking",
      description: "Track check-ins, check-outs, and time logs",
      icon: Clock,
      link: "/workforce/attendance",
      action: "View Attendance",
    },
    {
      title: "Time Off Management",
      description: "Handle vacation requests and leave management",
      icon: CalendarPlus,
      link: "/workforce/time-off",
      action: "View Requests",
    },
    {
      title: "Payroll",
      description: "Manage payroll periods and compensation",
      icon: DollarSign,
      link: "/workforce/payroll",
      action: "View Payroll",
    },
  ];

  const staffCount = employees?.length || 0;

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

        <Tabs defaultValue="getting-started" className="space-y-6">
          <TabsList>
            <TabsTrigger value="getting-started" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Getting Started
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started">
            <WorkforceGuides />
          </TabsContent>

          <TabsContent value="overview">
            {staffCount === 0 ? (
              <EmptyState
                icon={Users}
                title="No Staff Members Yet"
                description="Get started by adding your first staff member. You can manage their information, schedules, attendance, and payroll from here."
                action={{
                  label: "Add Staff Member",
                  onClick: () => navigate("/workforce/staff")
                }}
              />
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {modules.map((module) => (
                    <Card key={module.title} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <module.icon className="h-6 w-6 text-primary" />
                          </div>
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                        </div>
                        <CardDescription>{module.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Link to={module.link}>
                          <Button variant="outline" className="w-full">
                            {module.action}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Staff
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{staffCount}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Active Shifts Today
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Pending Time Off
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        This Month Payroll
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <RoleManagementDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} />
    </ModuleGate>
  );
};

export default Workforce;