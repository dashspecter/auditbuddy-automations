import { LucideIcon } from "lucide-react";

interface StatItem {
  label: string;
  value: number | string;
  icon: LucideIcon;
}

interface DashUsageStatsProps {
  stats: StatItem[];
}

export function DashUsageStats({ stats }: DashUsageStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border/60 p-4 space-y-1"
        >
          <div className="flex items-center gap-2">
            <stat.icon className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
