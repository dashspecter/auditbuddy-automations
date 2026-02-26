import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  useScoutMyStats,
  useScoutMonthlyEarnings,
  useScoutJobHistory,
} from "@/hooks/useScoutPerformance";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { CheckCircle, Clock, TrendingUp, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  posted: "bg-muted text-muted-foreground",
  accepted: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  submitted: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-destructive/10 text-destructive",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-muted text-muted-foreground",
};

export default function ScoutPerformance() {
  const { data: stats, isLoading: statsLoading } = useScoutMyStats();
  const { data: monthly, isLoading: monthlyLoading } = useScoutMonthlyEarnings();
  const { data: history } = useScoutJobHistory();

  const kpis = [
    { label: "Jobs Completed", value: stats?.jobsCompleted ?? 0, icon: CheckCircle, color: "text-primary" },
    { label: "On-Time Rate", value: `${stats?.onTimeRate ?? 0}%`, icon: Clock, color: "text-blue-500" },
    { label: "Approval Rate", value: `${stats?.approvalRate ?? 0}%`, icon: TrendingUp, color: "text-emerald-500" },
    {
      label: "Total Earned",
      value: `${(stats?.totalEarned ?? 0).toLocaleString()} ${stats?.currency ?? "RON"}`,
      icon: DollarSign,
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-foreground">My Performance</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-3 pb-2 px-3">
              {statsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center gap-2">
                  <kpi.icon className={`h-4 w-4 shrink-0 ${kpi.color}`} />
                  <div>
                    <p className="text-lg font-bold text-foreground leading-tight">{kpi.value}</p>
                    <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Earnings Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Earnings (6 months)</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <Tooltip />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(history ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No jobs yet</p>
            )}
            {(history ?? []).map((job) => (
              <div key={job.id} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge variant="secondary" className={`text-[10px] shrink-0 ${statusColors[job.status] ?? ""}`}>
                  {job.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
