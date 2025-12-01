import { Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TodayShiftCardProps {
  shift: any;
}

export const TodayShiftCard = ({ shift }: TodayShiftCardProps) => {
  if (!shift) return null;

  return (
    <Card className="mx-6 -mt-4 mb-6 p-6 shadow-lg">
      <div className="space-y-4">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold">
            {shift.shifts.start_time.slice(0, 5)}
          </span>
          <span className="text-xl text-muted-foreground">→</span>
          <span className="text-3xl font-bold">
            {shift.shifts.end_time.slice(0, 5)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="font-medium">{shift.shifts.role}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">{shift.shifts.locations?.name}</span>
        </div>
      </div>
    </Card>
  );
};
