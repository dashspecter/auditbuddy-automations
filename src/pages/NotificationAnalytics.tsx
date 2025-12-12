import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Eye, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";

interface AnalyticsData {
  id: string;
  title: string;
  type: string;
  target_roles: string[];
  created_at: string;
  recurrence_pattern: string;
  read_count: number;
  total_recipients: number;
  read_rate_percentage: number;
}

const COLORS = {
  info: 'hsl(var(--info))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  announcement: 'hsl(var(--primary))',
};

export default function NotificationAnalytics() {
  const { data: roleData } = useUserRole();
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['notification_analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AnalyticsData[];
    },
  });

  // Calculate summary statistics
  const totalNotifications = analytics.length;
  const avgReadRate = analytics.length > 0
    ? Math.round(analytics.reduce((sum, item) => sum + item.read_rate_percentage, 0) / analytics.length)
    : 0;
  const totalReads = analytics.reduce((sum, item) => sum + item.read_count, 0);
  const totalRecipients = analytics.reduce((sum, item) => sum + item.total_recipients, 0);

  // Group by notification type
  const typeData = Object.entries(
    analytics.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Top performing notifications
  const topNotifications = [...analytics]
    .sort((a, b) => b.read_rate_percentage - a.read_rate_percentage)
    .slice(0, 5)
    .map(item => ({
      title: item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title,
      readRate: item.read_rate_percentage,
      type: item.type,
    }));

  // Read rate by type
  const readRateByType = Object.entries(
    analytics.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = { total: 0, count: 0 };
      }
      acc[item.type].total += item.read_rate_percentage;
      acc[item.type].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>)
  ).map(([type, data]) => ({
    type,
    avgReadRate: Math.round(data.total / data.count),
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/notifications">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notification Analytics</h1>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredPermission="manage_notifications" fallbackMessage="You don't have permission to view notification analytics.">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/notifications">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notification Analytics</h1>
            <p className="text-muted-foreground">Engagement metrics and performance insights</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalNotifications}</div>
              <p className="text-xs text-muted-foreground">All time sent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Read Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgReadRate}%</div>
              <p className="text-xs text-muted-foreground">Across all notifications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reads</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReads}</div>
              <p className="text-xs text-muted-foreground">Messages opened</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecipients}</div>
              <p className="text-xs text-muted-foreground">Unique users reached</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Notifications by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications by Type</CardTitle>
              <CardDescription>Distribution of notification types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.info} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Average Read Rate by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Read Rate by Type</CardTitle>
              <CardDescription>Average engagement per notification type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={readRateByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="type" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avgReadRate" fill="hsl(var(--primary))" name="Avg Read Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Notifications</CardTitle>
            <CardDescription>Notifications with the highest read rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topNotifications} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--foreground))" />
                <YAxis dataKey="title" type="category" width={150} stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Legend />
                <Bar dataKey="readRate" fill="hsl(var(--success))" name="Read Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Detailed Notification Performance</CardTitle>
            <CardDescription>Complete analytics for all notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-center py-3 px-4">Reads</th>
                    <th className="text-center py-3 px-4">Recipients</th>
                    <th className="text-center py-3 px-4">Read Rate</th>
                    <th className="text-left py-3 px-4">Recurrence</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((item) => (
                    <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{item.title}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium`}
                          style={{ backgroundColor: `${COLORS[item.type as keyof typeof COLORS]}15`, color: COLORS[item.type as keyof typeof COLORS] }}>
                          {item.type}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">{item.read_count}</td>
                      <td className="text-center py-3 px-4">{item.total_recipients}</td>
                      <td className="text-center py-3 px-4">
                        <span className="font-semibold">{item.read_rate_percentage}%</span>
                      </td>
                      <td className="py-3 px-4 capitalize">{item.recurrence_pattern}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
