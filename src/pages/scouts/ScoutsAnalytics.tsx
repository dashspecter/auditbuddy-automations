import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useScoutAnalyticsKPIs,
  useScoutAnalyticsFunnel,
  useScoutAnalyticsWeeklyTrend,
  useScoutAnalyticsLocationStats,
  useScoutLeaderboard,
  useScoutPayoutSummary,
} from "@/hooks/useScoutAnalytics";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  Briefcase, TrendingUp, Star, AlertTriangle, Clock, DollarSign, Trophy,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function ScoutsAnalytics() {
  const { data: kpis, isLoading: kpisLoading } = useScoutAnalyticsKPIs();
  const { data: funnel, isLoading: funnelLoading } = useScoutAnalyticsFunnel();
  const { data: weekly, isLoading: weeklyLoading } = useScoutAnalyticsWeeklyTrend();
  const { data: locations } = useScoutAnalyticsLocationStats();
  const { data: leaderboard } = useScoutLeaderboard();
  const { data: payouts } = useScoutPayoutSummary();

  const kpiCards = [
    { label: "Total Jobs", value: kpis?.totalJobs ?? 0, icon: Briefcase, color: "text-primary" },
    { label: "Acceptance Rate", value: `${kpis?.acceptanceRate ?? 0}%`, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Avg Completion", value: `${kpis?.avgCompletionDays ?? 0}d`, icon: Clock, color: "text-blue-500" },
    { label: "Avg Rating", value: kpis?.avgScoutRating ?? 0, icon: Star, color: "text-amber-500" },
    { label: "Dispute Rate", value: `${kpis?.disputeRate ?? 0}%`, icon: AlertTriangle, color: "text-destructive" },
  ];

  const funnelData = funnel
    ? [
        { name: "Posted", value: funnel.posted },
        { name: "Accepted", value: funnel.accepted },
        { name: "Submitted", value: funnel.submitted },
        { name: "Approved", value: funnel.approved },
        { name: "Rejected", value: funnel.rejected },
      ]
    : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Scout Analytics</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {kpiCards.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="pt-4 pb-3 px-4">
                {kpisLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <div className="flex items-center gap-3">
                    <kpi.icon className={`h-5 w-5 shrink-0 ${kpi.color}`} />
                    <div>
                      <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Funnel Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Jobs Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              {funnelLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {funnelData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Weekly Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Weekly Completions (12 weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payout Summary */}
        {payouts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xl font-bold text-foreground">
                    {payouts.totalPaid.toLocaleString()} {payouts.currency}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xl font-bold text-foreground">
                    {payouts.totalPending.toLocaleString()} {payouts.currency}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending Payouts</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bottom Row: Location Stats + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Location Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Jobs by Location</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Pass Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(locations ?? []).slice(0, 10).map((loc) => (
                    <TableRow key={loc.location_id}>
                      <TableCell className="font-medium">{loc.location_name}</TableCell>
                      <TableCell className="text-right">{loc.total}</TableCell>
                      <TableCell className="text-right">
                        <span className={loc.passRate >= 70 ? "text-emerald-600" : "text-destructive"}>
                          {loc.passRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(locations ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Scout Leaderboard */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Scout Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Scout</TableHead>
                    <TableHead className="text-right">Reliability</TableHead>
                    <TableHead className="text-right">Jobs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(leaderboard ?? []).map((scout, idx) => (
                    <TableRow key={scout.scout_id}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>{scout.full_name}</TableCell>
                      <TableCell className="text-right">{scout.reliability_score}%</TableCell>
                      <TableCell className="text-right">{scout.completed_jobs_count}</TableCell>
                    </TableRow>
                  ))}
                  {(leaderboard ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No scouts yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
