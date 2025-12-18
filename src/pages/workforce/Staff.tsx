import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Info } from "lucide-react";
import { StaffTable } from "@/components/workforce/StaffTable";
import { EmployeeDialog } from "@/components/EmployeeDialog";
import { useLocations } from "@/hooks/useLocations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Staff = () => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: locations } = useLocations();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('workforce.staff.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t('workforce.staff.subtitle')}
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="h-4 w-4" />
          {t('workforce.staff.addStaff')}
        </Button>
      </div>

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
    </div>
  );
};

export default Staff;