import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, ClipboardCheck, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

export const PlatformAnalyticsTab = () => {
  // Platform-wide counts
  const { data: counts, isLoading } = useQuery({
    queryKey: ['platform-analytics-counts'],
    queryFn: async () => {
      const [
        { count: totalCompanies },
        { count: totalUsers },
        { count: totalAudits },
      ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('location_audits').select('*', { count: 'exact', head: true }),
      ]);
      return {
        totalCompanies: totalCompanies || 0,
        totalUsers: totalUsers || 0,
        totalAudits: totalAudits || 0,
      };
    },
  });

  // Scout module adoption
  const { data: scoutAdoption } = useQuery({
    queryKey: ['platform-scout-adoption'],
    queryFn: async () => {
      const { count } = await supabase
        .from('company_modules')
        .select('*', { count: 'exact', head: true })
        .eq('module_name', 'scouts')
        .eq('is_active', true);
      return count || 0;
    },
  });

  // Monthly growth (new companies per month, last 6 months)
  const { data: growthData } = useQuery({
    queryKey: ['platform-monthly-growth'],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
      const { data, error } = await supabase
        .from('companies')
        .select('created_at')
        .gte('created_at', sixMonthsAgo)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Group by month
      const monthMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const m = startOfMonth(subMonths(new Date(), i));
        monthMap[format(m, 'MMM yyyy')] = 0;
      }
      data?.forEach((c) => {
        const key = format(startOfMonth(new Date(c.created_at)), 'MMM yyyy');
        if (key in monthMap) monthMap[key]++;
      });
      return Object.entries(monthMap).map(([month, count]) => ({ month, count }));
    },
  });

  // Module usage breakdown
  const { data: moduleUsage } = useQuery({
    queryKey: ['platform-module-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_modules')
        .select('module_name')
        .eq('is_active', true);
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((m) => {
        counts[m.module_name] = (counts[m.module_name] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  const kpis = [
    { label: 'Companies', value: counts?.totalCompanies, icon: Building2 },
    { label: 'Users', value: counts?.totalUsers, icon: Users },
    { label: 'Audits', value: counts?.totalAudits, icon: ClipboardCheck },
    { label: 'Scout Adopters', value: scoutAdoption, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <kpi.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{kpi.value ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Company Growth
          </CardTitle>
          <CardDescription>New companies per month (last 6 months)</CardDescription>
        </CardHeader>
        <CardContent>
          {growthData ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-[250px] w-full" />
          )}
        </CardContent>
      </Card>

      {/* Module Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Module Usage Breakdown
          </CardTitle>
          <CardDescription>Active module counts across all companies</CardDescription>
        </CardHeader>
        <CardContent>
          {moduleUsage ? (
            <div className="space-y-2">
              {moduleUsage.map((m) => (
                <div key={m.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <span className="text-sm font-medium capitalize">{m.name.replace(/_/g, ' ')}</span>
                  <span className="text-sm text-muted-foreground">{m.count} companies</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
