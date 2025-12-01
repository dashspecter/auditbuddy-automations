import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { StaffTable } from "@/components/workforce/StaffTable";
import { EmployeeDialog } from "@/components/EmployeeDialog";
import { useLocations } from "@/hooks/useLocations";

const Staff = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: locations } = useLocations();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Directory</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team members and their information
            </p>
          </div>
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Staff Member
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffTable />
          </CardContent>
        </Card>
      </div>

      <EmployeeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        locations={locations || []}
      />
    </AppLayout>
  );
};

export default Staff;