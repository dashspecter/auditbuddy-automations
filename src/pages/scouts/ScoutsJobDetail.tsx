import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Banknote,
  FileText,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Loader2,
  Download,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useScoutJobs } from "@/hooks/useScoutJobs";
import {
  useScoutSubmissions,
  useScoutStepAnswers,
  useScoutMedia,
} from "@/hooks/useScoutSubmissions";
import { useScoutSignedView, useGenerateEvidencePacket } from "@/hooks/useScoutEvidence";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { format } from "date-fns";

const ScoutsJobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company } = useCompany();
  const signedView = useScoutSignedView();
  const generatePacket = useGenerateEvidencePacket();
  const [viewingMedia, setViewingMedia] = useState<string | null>(null);

  // Fetch job
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["scout-job-detail-core", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("scout_jobs")
        .select("*, locations(name), scout_templates(title), scouts(full_name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch steps
  const { data: steps } = useQuery({
    queryKey: ["scout-job-steps-core", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("scout_job_steps")
        .select("*")
        .eq("job_id", id)
        .order("step_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // Fetch submission
  const { data: submission } = useQuery({
    queryKey: ["scout-submission-core", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("scout_submissions")
        .select("*")
        .eq("job_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: answers } = useScoutStepAnswers(submission?.id);
  const { data: media } = useScoutMedia(submission?.id);

  const answerMap = new Map<string, any>();
  answers?.forEach((a) => answerMap.set(a.step_id, a));

  const mediaByStep = new Map<string, any[]>();
  media?.forEach((m) => {
    if (!mediaByStep.has(m.step_id)) mediaByStep.set(m.step_id, []);
    mediaByStep.get(m.step_id)!.push(m);
  });

  const handleViewMedia = async (storagePath: string) => {
    const result = await signedView.mutateAsync(storagePath);
    setViewingMedia(result.signedUrl);
  };

  if (jobLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Job not found.</p>
        <Button variant="ghost" onClick={() => navigate("/scouts/jobs")} className="mt-4">
          Back to Jobs
        </Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    posted: "bg-blue-500/10 text-blue-600",
    accepted: "bg-amber-500/10 text-amber-600",
    in_progress: "bg-purple-500/10 text-purple-600",
    submitted: "bg-cyan-500/10 text-cyan-600",
    approved: "bg-green-500/10 text-green-600",
    rejected: "bg-destructive/10 text-destructive",
    paid: "bg-emerald-500/10 text-emerald-600",
  };

  const timeline = [
    { label: "Created", date: job.created_at },
    { label: "Posted", date: job.posted_at },
    { label: "Accepted", date: job.accepted_at },
    { label: "Started", date: job.started_at },
    { label: "Submitted", date: job.submitted_at },
    { label: "Reviewed", date: job.reviewed_at },
    { label: "Approved", date: job.approved_at },
    { label: "Rejected", date: job.rejected_at },
    { label: "Paid", date: job.paid_at },
  ].filter((e) => e.date);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
          <p className="text-sm text-muted-foreground">
            {(job.scout_templates as any)?.title ?? "—"}
          </p>
        </div>
        <Badge variant="outline" className={statusColors[job.status] ?? ""}>
          {job.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">{(job.locations as any)?.name ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Banknote className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Payout</p>
              <p className="font-medium">{job.payout_amount} {job.currency}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Scout</p>
              <p className="font-medium">{(job.scouts as any)?.full_name ?? "Unassigned"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {timeline.map((e) => (
              <div key={e.label} className="text-sm">
                <span className="text-muted-foreground">{e.label}: </span>
                <span className="font-medium">
                  {format(new Date(e.date!), "MMM d, HH:mm")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step results */}
      {steps && steps.length > 0 && submission && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Step Results ({steps.length} steps)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, i) => {
              const answer = answerMap.get(step.id);
              const stepMedia = mediaByStep.get(step.id) ?? [];
              const passed = answer?.step_status === "passed";
              const failed = answer?.step_status === "failed";

              return (
                <div key={step.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        passed ? "bg-green-500/10 text-green-600" : failed ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : failed ? <XCircle className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{step.prompt}</p>
                      {answer && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {answer.answer_text ?? (answer.answer_bool !== null ? (answer.answer_bool ? "Yes" : "No") : null) ?? answer.answer_number ?? "—"}
                        </p>
                      )}
                      {answer?.reviewer_comment && (
                        <p className="text-xs italic mt-1 text-muted-foreground">
                          Reviewer: "{answer.reviewer_comment}"
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Media */}
                  {stepMedia.length > 0 && (
                    <div className="flex flex-wrap gap-2 ml-8">
                      {stepMedia.map((m: any) => (
                        <button
                          key={m.id}
                          onClick={() => handleViewMedia(m.storage_path)}
                          className="w-14 h-14 rounded bg-muted flex items-center justify-center border border-border hover:border-primary transition-colors"
                        >
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Evidence Packet */}
      {submission && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => generatePacket.mutate(submission.id)}
            disabled={generatePacket.isPending}
          >
            {generatePacket.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Generate Evidence Packet
          </Button>
          {submission.packet_storage_path && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Packet available
            </Badge>
          )}
        </div>
      )}

      {/* Media Viewer */}
      {viewingMedia && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewingMedia(null)}>
          <img src={viewingMedia} alt="Evidence" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default ScoutsJobDetail;
