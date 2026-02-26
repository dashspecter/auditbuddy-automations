import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useScoutJobDetail,
  useScoutJobSteps,
  useScoutSubmissionForJob,
  useScoutStepAnswers,
  useSubmitJob,
} from "@/hooks/useScoutJobFeed";

export default function ScoutSubmitReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [overallNotes, setOverallNotes] = useState("");

  const { data: job } = useScoutJobDetail(id);
  const { data: steps } = useScoutJobSteps(id);
  const { data: submission } = useScoutSubmissionForJob(id);
  const { data: answers } = useScoutStepAnswers(submission?.id);
  const submitJob = useSubmitJob();

  const answerMap = useMemo(() => {
    const map = new Map<string, any>();
    answers?.forEach((a) => map.set(a.step_id, a));
    return map;
  }, [answers]);

  const requiredSteps = steps?.filter((s) => s.is_required) ?? [];
  const answeredRequired = requiredSteps.filter((s) => answerMap.has(s.id));
  const allRequiredDone = answeredRequired.length === requiredSteps.length;
  const totalAnswered = steps?.filter((s) => answerMap.has(s.id)).length ?? 0;

  const handleSubmit = async () => {
    if (!submission || !id) return;
    await submitJob.mutateAsync({
      submissionId: submission.id,
      jobId: id,
      overallNotes: overallNotes || undefined,
    });
    navigate(`/jobs/${id}`);
  };

  if (!job || !steps || !submission) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(`/jobs/${id}/execute`)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to checklist
      </button>

      <h1 className="text-xl font-bold text-foreground">Review & Submit</h1>
      <p className="text-sm text-muted-foreground">
        Review your answers before submitting for review.
      </p>

      {/* Completeness summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Completion</span>
            <span className="text-sm text-muted-foreground">
              {totalAnswered} / {steps.length} steps answered
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-medium">Required steps</span>
            {allRequiredDone ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-200" variant="outline">
                <CheckCircle2 className="h-3 w-3 mr-1" /> All done
              </Badge>
            ) : (
              <Badge className="bg-red-500/10 text-red-600 border-red-200" variant="outline">
                <AlertCircle className="h-3 w-3 mr-1" />
                {answeredRequired.length} / {requiredSteps.length}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step-by-step review */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const answer = answerMap.get(step.id);
          const hasAnswer = !!answer;
          return (
            <Card key={step.id} className={!hasAnswer && step.is_required ? "border-red-200" : ""}>
              <CardContent className="p-3 flex items-start gap-3">
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    hasAnswer
                      ? "bg-green-500/10 text-green-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {hasAnswer ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{step.prompt}</p>
                  {hasAnswer && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {answer.answer_text ??
                        (answer.answer_bool !== null ? (answer.answer_bool ? "Yes" : "No") : null) ??
                        answer.answer_number ??
                        "Answered"}
                    </p>
                  )}
                  {!hasAnswer && step.is_required && (
                    <p className="text-xs text-red-500 mt-0.5">Required — not answered</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Overall notes */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Additional Notes (optional)</Label>
        <Textarea
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          placeholder="Any additional observations or comments..."
          rows={3}
        />
      </div>

      {/* Submit button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={!allRequiredDone || submitJob.isPending}
      >
        {submitJob.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Submit for Review
      </Button>
    </div>
  );
}
