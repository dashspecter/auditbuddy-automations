import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Info } from "lucide-react";
import { StaffTable } from "@/components/workforce/StaffTable";
import { EmployeeDialog } from "@/components/EmployeeDialog";
import { useLocations } from "@/hooks/useLocations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Staff = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: locations } = useLocations();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Staff Directory</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your team members and their information
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Job Titles (Workforce Management)</AlertTitle>
        <AlertDescription>
          <p className="text-sm text-muted-foreground">
            Staff members here have <strong>job titles</strong> (e.g., Chef, Server, Manager) used for scheduling, payroll, and workforce management. 
            This is separate from <strong>platform roles</strong> (Admin, Manager, HR, Checker) which control dashboard access. 
            A person can be both a staff member with a job title AND a platform user with dashboard access.
          </p>
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>All Staff Members</CardTitle>
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
    </div>
  );
};

export default Staff;