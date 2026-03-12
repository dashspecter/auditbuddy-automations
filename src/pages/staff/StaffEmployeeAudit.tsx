import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Star, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { useTerminology } from "@/hooks/useTerminology";

const StaffEmployeeAudit = () => {
  const navigate = useNavigate();
  const { employee, employees, audit, audits } = useTerminology();

  const employeeLabel = employee();
  const employeesLabel = employees();
  const auditLabel = audit();
  const auditsLabel = audits();
  const employeeLabelLower = employeeLabel.toLowerCase();
  const auditsLabelLower = auditsLabel.toLowerCase();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/staff")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{`${employeeLabel} ${auditLabel}`}</h1>
            <p className="text-sm opacity-80">Choose evaluation type</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="p-4">
          <p className="text-muted-foreground text-sm">
            {`Select the type of ${employeeLabelLower} evaluation you want to perform. ${employeeLabel} ${auditsLabelLower} are quick evaluations, while performance reviews are comprehensive assessments.`}
          </p>
        </Card>

        <div className="space-y-3">
          <Card
            className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary/30"
            onClick={() => navigate("/staff/staff-audit")}
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{`New ${employeeLabel} ${auditLabel}`}</h3>
                <p className="text-sm text-muted-foreground">
                  {`Quick evaluation of ${employeeLabelLower} performance and compliance`}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>

          <Card
            className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary/30"
            onClick={() => navigate("/staff/performance-review")}
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">New Performance Review</h3>
                <p className="text-sm text-muted-foreground">
                  Comprehensive assessment with goals and feedback
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">{`Recent ${employeesLabel} ${auditsLabel}`}</h3>
          <p className="text-sm text-muted-foreground text-center py-4">
            {`Your recent ${auditsLabelLower} will appear here`}
          </p>
        </Card>
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffEmployeeAudit;
