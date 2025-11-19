import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, TrendingUp, ClipboardCheck, FileText, Settings, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { StatsCard } from "./StatsCard";
import { RecentAudits } from "./RecentAudits";
import { ComplianceChart } from "./ComplianceChart";
import { CompliancePieChart } from "./CompliancePieChart";
import { DraftAudits } from "./DraftAudits";
import { useLocationAudits } from "@/hooks/useAudits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export const AdminDashboard = () => {
  const { data: audits, isLoading: auditsLoading } = useLocationAudits();
  
  const { data: usersCount } = useQuery({
    queryKey: ['users_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: notificationsCount } = useQuery({
    queryKey: ['active_notifications_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      if (error) throw error;
      return count || 0;
    },
  });

  const stats = useMemo(() => {
    if (!audits) return { totalAudits: 0, locations: 0, complianceRate: 0 };

    const totalAudits = audits.length;
    const locations = new Set(audits.map(a => a.location)).size;
    const compliant = audits.filter(a => (a.overall_score || 0) >= 80).length;
    const complianceRate = totalAudits > 0 ? Math.round((compliant / totalAudits) * 100) : 0;

    return { totalAudits, locations, complianceRate };
  }, [audits]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
          <p className="text-muted-foreground">System-wide overview and management</p>
        </div>
        <Badge variant="default" className="text-sm">Administrator</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">User Management</h3>
              <p className="text-sm text-muted-foreground">Manage user roles and permissions</p>
            </div>
          </div>
          <Link to="/admin/users">
            <Button variant="outline" className="w-full mt-4">
              <Settings className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Active Notifications</h3>
              <p className="text-sm text-muted-foreground">{notificationsCount || 0} active notifications</p>
            </div>
          </div>
          <Link to="/notifications">
            <Button variant="outline" className="w-full mt-4">
              <Bell className="h-4 w-4 mr-2" />
              View Notifications
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">New Audit</h3>
              <p className="text-sm text-muted-foreground">Create location audit</p>
            </div>
          </div>
          <Link to="/location-audit">
            <Button className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              New Location Audit
            </Button>
          </Link>
        </Card>
      </div>

      <DraftAudits />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Audits"
          value={auditsLoading ? "..." : stats.totalAudits.toString()}
          icon={ClipboardCheck}
          description="All time audits"
        />
        <StatsCard
          title="Total Users"
          value={usersCount?.toString() || "..."}
          icon={Users}
          description="Active users"
        />
        <StatsCard
          title="Locations"
          value={auditsLoading ? "..." : stats.locations.toString()}
          icon={FileText}
          description="Active locations"
        />
        <StatsCard
          title="Compliance Rate"
          value={auditsLoading ? "..." : `${stats.complianceRate}%`}
          icon={TrendingUp}
          description={`${stats.totalAudits > 0 ? Math.round((stats.complianceRate / 100) * stats.totalAudits) : 0} of ${stats.totalAudits} audits`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CompliancePieChart />
        <RecentAudits />
      </div>

      <div className="w-full">
        <ComplianceChart />
      </div>
    </div>
  );
};
