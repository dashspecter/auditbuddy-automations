import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Users, MapPin, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ManagerAuditsCard = () => {
  const navigate = useNavigate();

  return (
    <Card className="p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Perform Audits</h3>
      </div>

      <div className="space-y-3">
        {/* Location Audit */}
        <Button
          variant="outline"
          className="w-full justify-between h-auto py-3 px-4"
          onClick={() => navigate("/location-audit")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">Location Audit</div>
              <div className="text-xs text-muted-foreground">Inspect facilities & compliance</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Button>

        {/* Staff/Employee Audit */}
        <Button
          variant="outline"
          className="w-full justify-between h-auto py-3 px-4"
          onClick={() => navigate("/staff-audit/new")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">Employee Audit</div>
              <div className="text-xs text-muted-foreground">Evaluate staff performance</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </Card>
  );
};
