import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Banknote, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useScoutJobDetail,
  useScoutJobSteps,
  useAcceptJob,
  useStartJob,
  useScoutSubmissionForJob,
} from "@/hooks/useScoutJobFeed";
import { format } from "date-fns";

export default function ScoutJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useScoutJobDetail(id);
  const { data: steps } = useScoutJobSteps(id);
  const { data: submission } = useScoutSubmissionForJob(id);
  const acceptJob = useAcceptJob();
  const startJob = useStartJob();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Job not found.</p>
        <Button variant="ghost" onClick={() => navigate("/")} className="mt-4">
          Back to Jobs
        </Button>
      </div>
    );
  }

  const locationName = (job.locations as any)?.name ?? "Unknown";
  const companyName = (job.companies as any)?.name ?? "";
  const canAccept = job.status === "posted" && !job.assigned_scout_id;
  const canStart = job.status === "accepted" && !submission;
  const canResume = job.status === "in_progress" && submission;
  const isSubmitted = job.status === "submitted";
  const isReviewed = job.status === "approved" || job.status === "rejected";

  const handleAccept = () => acceptJob.mutate(id!);
  const handleStart = async () => {
    const sub = await startJob.mutateAsync(id!);
    navigate(`/jobs/${id}/execute`);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Job Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{job.title}</h1>
        {companyName && <p className="text-sm text-muted-foreground">{companyName}</p>}
      </div>

      {/* Key Info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{locationName}</span>
          </div>
          {job.time_window_start && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(job.time_window_start), "MMM d, HH:mm")}
                {job.time_window_end && ` – ${format(new Date(job.time_window_end), "MMM d, HH:mm")}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Banknote className="h-4 w-4" />
            <span>{job.payout_amount} {job.currency}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {job.notes_public && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.notes_public}</p>
          </CardContent>
        </Card>
      )}

      {/* Steps Preview */}
      {steps && steps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Checklist ({steps.length} steps)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-foreground">{step.prompt}</p>
                    <div className="flex gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {step.step_type}
                      </Badge>
                      {step.is_required && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-200 text-red-500">
                          Required
                        </Badge>
                      )}
                      {(step.min_photos ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {step.min_photos}+ photos
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Action Buttons */}
      <div className="pb-4">
        {canAccept && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleAccept}
            disabled={acceptJob.isPending}
          >
            {acceptJob.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Accept Job
          </Button>
        )}
        {canStart && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleStart}
            disabled={startJob.isPending}
          >
            {startJob.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Start Job
          </Button>
        )}
        {canResume && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate(`/jobs/${id}/execute`)}
          >
            Continue Job
          </Button>
        )}
        {isSubmitted && (
          <div className="text-center py-4">
            <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-200" variant="outline">
              Submitted — Awaiting Review
            </Badge>
          </div>
        )}
        {isReviewed && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/jobs/${id}/result`)}
          >
            View Results
          </Button>
        )}
      </div>
    </div>
  );
}
