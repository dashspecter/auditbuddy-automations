import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useScoutJobs } from "@/hooks/useScoutJobs";
import { useScoutSubmissions } from "@/hooks/useScoutSubmissions";
import { ClipboardCheck, FileText, Clock, CheckCircle, Plus, Eye } from "lucide-react";

const ScoutsOverview = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: allJobs = [], isLoading: jobsLoading } = useScoutJobs();
  const { data: pendingReviews = [] } = useScoutSubmissions('pending_review');

  const stats = {
    totalJobs: allJobs.length,
    posted: allJobs.filter(j => j.status === 'posted').length,
    inProgress: allJobs.filter(j => ['accepted', 'in_progress'].includes(j.status)).length,
    pendingReview: pendingReviews.length,
    approved: allJobs.filter(j => j.status === 'approved').length,
    completionRate: allJobs.length > 0
      ? Math.round((allJobs.filter(j => j.status === 'approved').length / allJobs.length) * 100)
      : 0,
  };

  const kpis = [
    { label: "Pending Reviews", value: stats.pendingReview, icon: Clock, color: "text-amber-500" },
    { label: "Posted Jobs", value: stats.posted, icon: FileText, color: "text-blue-500" },
    { label: "In Progress", value: stats.inProgress, icon: ClipboardCheck, color: "text-primary" },
    { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scouts</h1>
          <p className="text-muted-foreground">Manage field checks, review submissions, and track scout jobs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/scouts/review')}>
            <Eye className="h-4 w-4 mr-2" />
            Review Queue {stats.pendingReview > 0 && `(${stats.pendingReview})`}
          </Button>
          <Button onClick={() => navigate('/scouts/jobs/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobsLoading ? '–' : kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.completionRate}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.approved} of {stats.totalJobs} jobs approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start" onClick={() => navigate('/scouts/jobs')}>
              <FileText className="h-4 w-4 mr-2" /> View All Jobs
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/scouts/templates')}>
              <ClipboardCheck className="h-4 w-4 mr-2" /> Manage Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScoutsOverview;
