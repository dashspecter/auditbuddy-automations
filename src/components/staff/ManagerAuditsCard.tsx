import { Card } from "@/components/ui/card";
import { ClipboardCheck, Users, MapPin, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTerminology } from "@/hooks/useTerminology";

export const ManagerAuditsCard = () => {
  const navigate = useNavigate();
  const term = useTerminology();
  const locationLabel = term.location();
  const auditLabel = term.audit();
  const employeeLabel = term.employee();

  return (
    <Card className="p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Perform {term.audits()}</h3>
      </div>

      <div className="space-y-3">
        <div
          className="w-full flex items-center justify-between h-auto py-3 px-4 border rounded-md cursor-pointer hover:bg-accent transition-colors"
          onClick={() => navigate("/staff/location-audit")}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">{locationLabel} {auditLabel}</div>
              <div className="text-xs text-muted-foreground">Inspect facilities & compliance</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>

        <div
          className="w-full flex items-center justify-between h-auto py-3 px-4 border rounded-md cursor-pointer hover:bg-accent transition-colors"
          onClick={() => navigate("/staff/employee-audit")}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">{employeeLabel} {auditLabel}</div>
              <div className="text-xs text-muted-foreground">Evaluate performance</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
};
