import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendLabel?: string;
  description?: string;
}

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  description 
}: StatsCardProps) => {
  const isPositiveTrend = trend?.startsWith("+");
  
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && trendLabel && (
            <div className="flex items-center gap-1 text-sm">
              <span className={cn(
                "font-medium",
                isPositiveTrend ? "text-success" : "text-destructive"
              )}>
                {trend}
              </span>
              <span className="text-muted-foreground">{trendLabel}</span>
            </div>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  );
};
