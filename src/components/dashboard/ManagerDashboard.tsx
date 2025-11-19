import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, TrendingUp, ClipboardCheck, FileText, Bell, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { StatsCard } from "./StatsCard";
import { RecentAudits } from "./RecentAudits";
import { ComplianceChart } from "./ComplianceChart";
import { CompliancePieChart } from "./CompliancePieChart";
import { DraftAudits } from "./DraftAudits";
import { DashboardGreeting } from "./DashboardGreeting";
import { LocationTrendAnalysis } from "./LocationTrendAnalysis";
import { useLocationAudits } from "@/hooks/useAudits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export const ManagerDashboard = () => {
  const { data: audits, isLoading: auditsLoading } = useLocationAudits();
  
  const { data: checkersCount } = useQuery({
    queryKey: ['checkers_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'checker');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pendingAudits } = useQuery({
    queryKey: ['pending_audits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_audits')
        .select('*')
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!audits) return { totalAudits: 0, locations: 0, complianceRate: 0, recentAudits: 0 };

    const totalAudits = audits.length;
    const locations = new Set(audits.map(a => a.location)).size;
    const compliant = audits.filter(a => (a.overall_score || 0) >= 80).length;
    const complianceRate = totalAudits > 0 ? Math.round((compliant / totalAudits) * 100) : 0;
    
    // Audits from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentAudits = audits.filter(a => new Date(a.created_at) > sevenDaysAgo).length;

    return { totalAudits, locations, complianceRate, recentAudits };
  }, [audits]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Manager Dashboard</h2>
          <p className="text-muted-foreground">Team oversight and location management</p>
        </div>
        <Badge variant="secondary" className="text-sm">Manager</Badge>
      </div>

      <DashboardGreeting />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Send Notification</h3>
              <p className="text-sm text-muted-foreground">Notify checkers about tasks</p>
            </div>
          </div>
          <Link to="/notifications">
            <Button variant="outline" className="w-full mt-4">
              <Bell className="h-4 w-4 mr-2" />
              Create Notification
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">View Reports</h3>
              <p className="text-sm text-muted-foreground">Location performance</p>
            </div>
          </div>
          <Link to="/reports">
            <Button variant="outline" className="w-full mt-4">
              <FileText className="h-4 w-4 mr-2" />
              View Reports
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

      {(pendingAudits?.length || 0) > 0 && (
        <Card className="bg-warning/10 border-warning/30">
          <div className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <h3 className="font-semibold">Pending Reviews</h3>
              <p className="text-sm text-muted-foreground">
                {pendingAudits?.length} audit{(pendingAudits?.length || 0) !== 1 ? 's' : ''} waiting for review
              </p>
            </div>
            <Link to="/audits?status=pending">
              <Button variant="outline" size="sm">Review</Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Audits"
          value={auditsLoading ? "..." : stats.totalAudits.toString()}
          icon={ClipboardCheck}
          description="All location audits"
        />
        <StatsCard
          title="Active Checkers"
          value={checkersCount?.toString() || "..."}
          icon={Users}
          description="Team members"
        />
        <StatsCard
          title="Locations"
          value={auditsLoading ? "..." : stats.locations.toString()}
          icon={FileText}
          description="Managed locations"
        />
        <StatsCard
          title="This Week"
          value={auditsLoading ? "..." : stats.recentAudits.toString()}
          icon={TrendingUp}
          description="Audits last 7 days"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CompliancePieChart />
        <RecentAudits />
      </div>

      <div className="w-full">
        <ComplianceChart />
      </div>

      <div className="w-full">
        <LocationTrendAnalysis />
      </div>
    </div>
  );
};
