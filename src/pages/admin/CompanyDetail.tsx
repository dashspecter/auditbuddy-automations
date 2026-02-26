import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, Users, ClipboardCheck, Briefcase, Calendar, Package } from "lucide-react";
import { format } from "date-fns";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: company, isLoading } = useQuery({
    queryKey: ['admin-company-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*, industries(name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-company-stats', id],
    queryFn: async () => {
      const [
        { count: userCount },
        { count: auditCount },
        { count: scoutJobCount },
      ] = await Promise.all([
        supabase.from('company_users').select('*', { count: 'exact', head: true }).eq('company_id', id!),
        supabase.from('location_audits').select('*', { count: 'exact', head: true }).eq('company_id', id!),
        (supabase as any).from('scout_jobs').select('*', { count: 'exact', head: true }).eq('company_id', id!),
      ]);
      return { userCount: userCount || 0, auditCount: auditCount || 0, scoutJobCount: scoutJobCount || 0 };
    },
    enabled: !!id,
  });

  const { data: modules } = useQuery({
    queryKey: ['admin-company-modules', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_modules')
        .select('module_name, is_active')
        .eq('company_id', id!)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-company-activity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_audits')
        .select('id, status, audit_date, location')
        .eq('company_id', id!)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!company) {
    return <div className="p-6 text-center text-muted-foreground">Company not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/platform')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Building2 className="h-6 w-6" />
            {company.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge>{company.status}</Badge>
            <Badge variant="outline">{company.subscription_tier}</Badge>
            {(company as any).industries?.name && (
              <Badge variant="secondary">{(company as any).industries.name}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Users', value: stats?.userCount, icon: Users },
          { label: 'Audits', value: stats?.auditCount, icon: ClipboardCheck },
          { label: 'Scout Jobs', value: stats?.scoutJobCount, icon: Briefcase },
          { label: 'Created', value: format(new Date(company.created_at), 'MMM d, yyyy'), icon: Calendar },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Active Modules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {modules?.length === 0 ? (
              <p className="text-muted-foreground">No active modules</p>
            ) : (
              modules?.map((m) => (
                <Badge key={m.module_name} variant="secondary" className="capitalize">
                  {m.module_name.replace(/_/g, ' ')}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audits</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity?.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{a.location || 'Unknown location'}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.audit_date ? format(new Date(a.audit_date), 'MMM d, yyyy') : 'No date'}
                    </p>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
