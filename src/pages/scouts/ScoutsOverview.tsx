import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useScoutJobs } from "@/hooks/useScoutJobs";
import { useScoutSubmissions } from "@/hooks/useScoutSubmissions";
import { useScoutTemplates } from "@/hooks/useScoutTemplates";
import { useCompany } from "@/hooks/useCompany";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardCheck, FileText, Clock, CheckCircle, Plus, Eye,
  LayoutTemplate, Users, Send, Search, Wallet, ArrowRight, Check, PartyPopper,
} from "lucide-react";
import { useState } from "react";

const ScoutsOverview = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: allJobs = [], isLoading: jobsLoading } = useScoutJobs();
  const { data: pendingReviews = [] } = useScoutSubmissions('pending_review');
  const { data: templates = [] } = useScoutTemplates();
  const { data: company } = useCompany();
  const companyId = company?.id;

  const [setupDismissed, setSetupDismissed] = useState(false);

  // Roster count — scouts assigned to company jobs
  const { data: rosterCount = 0 } = useQuery({
    queryKey: ["scouts-roster-count", companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { data, error } = await supabase
        .from("scout_jobs")
        .select("assigned_scout_id")
        .eq("company_id", companyId)
        .not("assigned_scout_id", "is", null);
      if (error) throw error;
      return new Set((data ?? []).map(j => j.assigned_scout_id)).size;
    },
    enabled: !!companyId,
  });

  // Reviewed count (approved jobs)
  const approvedCount = allJobs.filter(j => j.status === 'approved').length;

  const stats = {
    totalJobs: allJobs.length,
    posted: allJobs.filter(j => j.status === 'posted').length,
    inProgress: allJobs.filter(j => ['accepted', 'in_progress'].includes(j.status)).length,
    pendingReview: pendingReviews.length,
    approved: approvedCount,
    completionRate: allJobs.length > 0
      ? Math.round((approvedCount / allJobs.length) * 100)
      : 0,
  };

  const kpis = [
    { label: "Pending Reviews", value: stats.pendingReview, icon: Clock, color: "text-amber-500" },
    { label: "Posted Jobs", value: stats.posted, icon: FileText, color: "text-blue-500" },
    { label: "In Progress", value: stats.inProgress, icon: ClipboardCheck, color: "text-primary" },
    { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-emerald-500" },
  ];

  const steps = [
    {
      num: 1,
      title: "Create a Template",
      description: "Define the checklist scouts will follow in the field.",
      icon: LayoutTemplate,
      route: "/scouts/templates",
      cta: "Go to Templates",
      isDone: templates.length > 0,
    },
    {
      num: 2,
      title: "Add Scouts",
      description: "Invite field workers to your company roster.",
      icon: Users,
      route: "/scouts/roster",
      cta: "Manage Roster",
      isDone: rosterCount > 0,
    },
    {
      num: 3,
      title: "Post a Job",
      description: "Assign a template to a location for scouts to complete.",
      icon: Send,
      route: "/scouts/jobs/new",
      cta: "Create Job",
      isDone: allJobs.length > 0,
    },
    {
      num: 4,
      title: "Review Submissions",
      description: "Approve or reject completed scout work.",
      icon: Search,
      route: "/scouts/review",
      cta: "Review Queue",
      isDone: approvedCount > 0,
    },
    {
      num: 5,
      title: "Track Payouts",
      description: "Manage payments for approved jobs.",
      icon: Wallet,
      route: "/scouts/payouts",
      cta: "View Payouts",
      isDone: false, // always available
    },
  ];

  const allStepsDone = steps.slice(0, 4).every(s => s.isDone);
  const showSetupGuide = !allStepsDone || !setupDismissed;
  const completedSteps = steps.filter(s => s.isDone).length;

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* KPI Cards — always visible */}
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

      {/* Setup Guide OR Dashboard */}
      {allStepsDone && setupDismissed ? (
        /* Original dashboard view */
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
      ) : allStepsDone && !setupDismissed ? (
        /* Setup complete banner */
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <PartyPopper className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold">Setup complete!</p>
                <p className="text-sm text-muted-foreground">You're all set up and ready to manage your scouts.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSetupDismissed(true)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Step-by-step setup guide */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Getting Started</h2>
              <p className="text-sm text-muted-foreground">
                Complete these steps to start using Scouts — {completedSteps} of {steps.length} done
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {steps.map((step) => (
              <Card
                key={step.num}
                className={`relative transition-all flex flex-col ${
                  step.isDone
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'hover:border-primary/30'
                }`}
              >
                {step.isDone && (
                  <div className="absolute top-3 right-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={step.isDone ? "default" : "secondary"}
                      className={`h-6 w-6 p-0 flex items-center justify-center text-xs font-bold rounded-full ${
                        step.isDone ? 'bg-emerald-500 border-emerald-500' : ''
                      }`}
                    >
                      {step.num}
                    </Badge>
                    <step.icon className={`h-4 w-4 ${step.isDone ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  </div>
                  <CardTitle className="text-sm">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{step.description}</p>
                  <Button
                    variant={step.isDone ? "outline" : "default"}
                    size="sm"
                    className="w-full text-xs mt-auto"
                    onClick={() => navigate(step.route)}
                  >
                    {step.cta}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoutsOverview;
