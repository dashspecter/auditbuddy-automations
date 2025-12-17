import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useWorkOrderTrends, 
  useAssetHealthDistribution, 
  useWorkOrdersByPriority,
  usePartsUsageTrend,
  useCompletionTimeStats
} from '@/hooks/useCmmsReporting';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { Loader2, Clock, TrendingUp, Wrench, Package } from 'lucide-react';

export default function CmmsReporting() {
  const { data: woTrends, isLoading: loadingTrends } = useWorkOrderTrends(6);
  const { data: assetHealth, isLoading: loadingHealth } = useAssetHealthDistribution();
  const { data: woPriority, isLoading: loadingPriority } = useWorkOrdersByPriority();
  const { data: partsUsage, isLoading: loadingParts } = usePartsUsageTrend(6);
  const { data: completionStats, isLoading: loadingCompletion } = useCompletionTimeStats();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CMMS Reports & Analytics</h1>
        <p className="text-muted-foreground">Maintenance performance insights and trends</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingCompletion ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{completionStats?.avgHours || 0}h</div>
                <p className="text-xs text-muted-foreground">across all work orders</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Avg</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {loadingCompletion ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {Math.round((completionStats?.byPriority?.critical || 0) * 10) / 10}h
                </div>
                <p className="text-xs text-muted-foreground">critical priority</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority Avg</CardTitle>
            <Wrench className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loadingCompletion ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {Math.round((completionStats?.byPriority?.high || 0) * 10) / 10}h
                </div>
                <p className="text-xs text-muted-foreground">high priority</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Priority Avg</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loadingCompletion ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {Math.round((completionStats?.byPriority?.medium || 0) * 10) / 10}h
                </div>
                <p className="text-xs text-muted-foreground">medium priority</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Order Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Work Order Trends</CardTitle>
            <CardDescription>Created vs completed over 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTrends ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={woTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="created" 
                    stackId="1"
                    stroke="hsl(var(--chart-1))" 
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.6}
                    name="Created"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stackId="2"
                    stroke="hsl(var(--chart-2))" 
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.6}
                    name="Completed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Asset Health Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Health Distribution</CardTitle>
            <CardDescription>Current status of all assets</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : assetHealth && assetHealth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={assetHealth}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count }) => `${status}: ${count}`}
                    outerRadius={100}
                    dataKey="count"
                  >
                    {assetHealth.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No asset data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Orders by Priority */}
        <Card>
          <CardHeader>
            <CardTitle>Open Work Orders by Priority</CardTitle>
            <CardDescription>Current backlog breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPriority ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={woPriority} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="priority" type="category" fontSize={12} width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="open" stackId="a" fill="hsl(var(--chart-1))" name="Open" />
                  <Bar dataKey="in_progress" stackId="a" fill="hsl(var(--chart-3))" name="In Progress" />
                  <Bar dataKey="on_hold" stackId="a" fill="hsl(var(--chart-4))" name="On Hold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Parts Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Parts Consumption</CardTitle>
            <CardDescription>Monthly parts usage trend</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingParts ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={partsUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="usage" 
                    stroke="hsl(var(--chart-5))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-5))' }}
                    name="Parts Used"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Reactive vs Preventive */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Reactive vs Preventive Maintenance</CardTitle>
            <CardDescription>Work order type distribution over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTrends ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={woTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reactive" fill="hsl(var(--chart-1))" name="Reactive" />
                  <Bar dataKey="preventive" fill="hsl(var(--chart-2))" name="Preventive" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
