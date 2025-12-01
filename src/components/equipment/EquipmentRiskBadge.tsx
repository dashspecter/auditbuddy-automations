import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";

interface EquipmentRiskBadgeProps {
  lastCheckDate: string | null;
  nextCheckDate: string | null;
  status: string;
}

export const EquipmentRiskBadge = ({
  lastCheckDate,
  nextCheckDate,
  status,
}: EquipmentRiskBadgeProps) => {
  if (status !== "active") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        {status}
      </Badge>
    );
  }

  if (nextCheckDate) {
    const daysUntilCheck = differenceInDays(new Date(nextCheckDate), new Date());
    
    if (daysUntilCheck < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overdue ({Math.abs(daysUntilCheck)} days)
        </Badge>
      );
    } else if (daysUntilCheck <= 7) {
      return (
        <Badge variant="default" className="gap-1 bg-warning text-warning-foreground">
          <Clock className="h-3 w-3" />
          Due Soon ({daysUntilCheck} days)
        </Badge>
      );
    }
  }

  if (!lastCheckDate) {
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        No Checks Yet
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="gap-1 bg-success text-success-foreground">
      <CheckCircle className="h-3 w-3" />
      Up to Date
    </Badge>
  );
};
