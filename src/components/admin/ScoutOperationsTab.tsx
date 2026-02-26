import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, AlertTriangle, UserCheck } from "lucide-react";
import { format } from "date-fns";

export const ScoutOperationsTab = () => {
  // Total scouts across all companies
  const { data: scoutStats, isLoading: statsLoading } = useQuery({
    queryKey: ['platform-scout-stats'],
    queryFn: async () => {
      const [
        { count: totalScouts },
        { count: activeJobs },
        { count: pendingScouts },
      ] = await Promise.all([
        (supabase as any).from('scouts').select('*', { count: 'exact', head: true }),
        (supabase as any).from('scout_jobs').select('*', { count: 'exact', head: true }).in('status', ['posted', 'accepted', 'in_progress']),
        (supabase as any).from('scouts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      return { totalScouts: totalScouts || 0, activeJobs: activeJobs || 0, pendingScouts: pendingScouts || 0 };
    },
  });

  // Open disputes
  const { data: disputes, isLoading: disputesLoading } = useQuery({
    queryKey: ['platform-scout-disputes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('scout_disputes')
        .select('id, message, status, created_at, scout_id, job_id')
        .in('status', ['open', 'under_review'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Pending scout approvals
  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['platform-pending-scouts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('scouts')
        .select('id, full_name, phone, city, status, created_at, company_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const kpis = [
    { label: 'Total Scouts', value: scoutStats?.totalScouts, icon: Users, color: 'text-primary' },
    { label: 'Active Jobs', value: scoutStats?.activeJobs, icon: Briefcase, color: 'text-chart-2' },
    { label: 'Pending Approvals', value: scoutStats?.pendingScouts, icon: UserCheck, color: 'text-chart-4' },
    { label: 'Open Disputes', value: disputes?.length, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  {statsLoading ? (
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

      {/* Dispute Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Open Disputes
          </CardTitle>
          <CardDescription>{disputes?.length || 0} disputes requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {disputesLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : disputes?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No open disputes</p>
          ) : (
            <div className="space-y-3">
              {disputes?.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{d.message || 'No reason provided'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(d.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant={d.status === 'open' ? 'destructive' : 'secondary'}>{d.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Scout Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Scout Approval Queue
          </CardTitle>
          <CardDescription>{pendingApprovals?.length || 0} scouts awaiting approval</CardDescription>
        </CardHeader>
        <CardContent>
          {approvalsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : pendingApprovals?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending scout approvals</p>
          ) : (
            <div className="space-y-3">
              {pendingApprovals?.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.city || 'No city'} · Applied {format(new Date(s.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
