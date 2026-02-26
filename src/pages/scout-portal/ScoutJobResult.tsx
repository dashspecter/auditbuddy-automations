import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useScoutJobDetail,
  useScoutJobSteps,
  useScoutSubmissionForJob,
  useScoutStepAnswers,
} from "@/hooks/useScoutJobFeed";
import { format } from "date-fns";

export default function ScoutJobResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useScoutJobDetail(id);
  const { data: steps } = useScoutJobSteps(id);
  const { data: submission } = useScoutSubmissionForJob(id);
  const { data: answers } = useScoutStepAnswers(submission?.id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!job || !submission) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Result not available.</p>
        <Button variant="ghost" onClick={() => navigate("/")} className="mt-4">
          Back to Jobs
        </Button>
      </div>
    );
  }

  const isApproved = submission.status === "approved" || job.status === "approved";
  const isRejected = submission.status === "rejected" || job.status === "rejected";

  const answerMap = new Map<string, any>();
  answers?.forEach((a) => answerMap.set(a.step_id, a));

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Jobs
      </button>

      <h1 className="text-xl font-bold text-foreground">{job.title}</h1>

      {/* Result Banner */}
      <Card className={isApproved ? "border-green-200 bg-green-500/5" : "border-red-200 bg-red-500/5"}>
        <CardContent className="p-4 flex items-center gap-3">
          {isApproved ? (
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          ) : (
            <XCircle className="h-8 w-8 text-red-600" />
          )}
          <div>
            <p className="font-semibold text-foreground">
              {isApproved ? "Approved" : "Rejected"}
            </p>
            {submission.reviewed_at && (
              <p className="text-xs text-muted-foreground">
                Reviewed on {format(new Date(submission.reviewed_at), "MMM d, yyyy HH:mm")}
              </p>
            )}
          </div>
          {isApproved && (
            <Badge className="ml-auto bg-green-500/10 text-green-600 border-green-200" variant="outline">
              {job.payout_amount} {job.currency}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Reviewer notes */}
      {submission.reviewer_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Reviewer Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {submission.reviewer_notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Per-step results */}
      {steps && steps.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Step Results</h3>
          {steps.map((step, i) => {
            const answer = answerMap.get(step.id);
            const stepPassed = answer?.step_status === "passed";
            const stepFailed = answer?.step_status === "failed";

            return (
              <Card key={step.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      stepPassed
                        ? "bg-green-500/10 text-green-600"
                        : stepFailed
                        ? "bg-red-500/10 text-red-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {stepPassed ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : stepFailed ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{step.prompt}</p>
                    {answer?.reviewer_comment && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{answer.reviewer_comment}"
                      </p>
                    )}
                    {answer && !stepPassed && !stepFailed && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {answer.answer_text ??
                          (answer.answer_bool !== null ? (answer.answer_bool ? "Yes" : "No") : null) ??
                          answer.answer_number ??
                          "Answered"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
