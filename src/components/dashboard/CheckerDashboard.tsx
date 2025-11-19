import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, ClipboardCheck, Calendar, Target, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { StatsCard } from "./StatsCard";
import { DashboardGreeting } from "./DashboardGreeting";
import { useLocationAudits } from "@/hooks/useAudits";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useMemo } from "react";

export const CheckerDashboard = () => {
  const { user } = useAuth();
  const { data: allAudits, isLoading: auditsLoading } = useLocationAudits();

  // Filter audits for current user only
  const myAudits = useMemo(() => {
    if (!allAudits || !user) return [];
    return allAudits.filter(audit => audit.user_id === user.id);
  }, [allAudits, user]);

  const stats = useMemo(() => {
    if (!myAudits.length) return { 
      totalAudits: 0, 
      completedAudits: 0, 
      avgScore: 0,
      thisMonth: 0 
    };

    const totalAudits = myAudits.length;
    const completedAudits = myAudits.filter(a => a.status === 'compliant').length;
    const totalScore = myAudits.reduce((sum, a) => sum + (a.overall_score || 0), 0);
    const avgScore = totalAudits > 0 ? Math.round(totalScore / totalAudits) : 0;
    
    // Audits from current month
    const now = new Date();
    const thisMonth = myAudits.filter(a => {
      const auditDate = new Date(a.created_at);
      return auditDate.getMonth() === now.getMonth() && 
             auditDate.getFullYear() === now.getFullYear();
    }).length;

    return { totalAudits, completedAudits, avgScore, thisMonth };
  }, [myAudits]);

  const recentAudits = useMemo(() => {
    return [...myAudits]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [myAudits]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'compliant':
        return 'bg-success/20 text-success border-success/30';
      case 'pending':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'non-compliant':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Dashboard</h2>
          <p className="text-muted-foreground">Track your audit performance</p>
        </div>
        <Badge variant="outline" className="text-sm">Checker</Badge>
      </div>

      <DashboardGreeting />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">New Audit</h3>
              <p className="text-sm text-muted-foreground">Create a new location audit</p>
            </div>
          </div>
          <Link to="/location-audit">
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Audit
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">View All Audits</h3>
              <p className="text-sm text-muted-foreground">Browse your audit history</p>
            </div>
          </div>
          <Link to="/audits">
            <Button variant="outline" className="w-full">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              View Audits
            </Button>
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Audits"
          value={auditsLoading ? "..." : stats.totalAudits.toString()}
          icon={ClipboardCheck}
          description="All time"
        />
        <StatsCard
          title="Completed"
          value={auditsLoading ? "..." : stats.completedAudits.toString()}
          icon={CheckCircle2}
          description="Finished audits"
        />
        <StatsCard
          title="Average Score"
          value={auditsLoading ? "..." : `${stats.avgScore}%`}
          icon={Target}
          description="Performance"
        />
        <StatsCard
          title="This Month"
          value={auditsLoading ? "..." : stats.thisMonth.toString()}
          icon={Calendar}
          description="Audits completed"
        />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">My Recent Audits</h3>
            <p className="text-sm text-muted-foreground">Last 5 audits you've created</p>
          </div>
          <Link to="/audits">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>

        {auditsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : recentAudits.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No audits yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first audit to get started</p>
            <Link to="/location-audit">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Audit
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAudits.map((audit) => (
              <Link key={audit.id} to={`/audits/${audit.id}`}>
                <Card className="p-4 hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{audit.location}</h4>
                        <Badge variant="outline" className={getStatusColor(audit.status || 'draft')}>
                          {audit.status || 'draft'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(audit.audit_date || audit.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    {audit.overall_score !== null && audit.overall_score !== undefined && (
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(audit.overall_score)}`}>
                          {audit.overall_score}%
                        </div>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
