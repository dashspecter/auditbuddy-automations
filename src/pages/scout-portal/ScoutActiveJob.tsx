import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useScoutJobDetail,
  useScoutJobSteps,
  useScoutSubmissionForJob,
  useScoutStepAnswers,
  useSaveStepAnswer,
} from "@/hooks/useScoutJobFeed";

export default function ScoutActiveJob() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const { data: job, isLoading: jobLoading } = useScoutJobDetail(id);
  const { data: steps, isLoading: stepsLoading } = useScoutJobSteps(id);
  const { data: submission } = useScoutSubmissionForJob(id);
  const { data: answers } = useScoutStepAnswers(submission?.id);
  const saveAnswer = useSaveStepAnswer();

  const isLoading = jobLoading || stepsLoading;
  const totalSteps = steps?.length ?? 0;
  const step = steps?.[currentStep];

  const answerMap = useMemo(() => {
    const map = new Map<string, any>();
    answers?.forEach((a) => map.set(a.step_id, a));
    return map;
  }, [answers]);

  const currentAnswer = step ? answerMap.get(step.id) : null;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const answeredCount = useMemo(() => {
    if (!steps || !answers) return 0;
    return steps.filter((s) => answerMap.has(s.id)).length;
  }, [steps, answerMap]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!job || !steps?.length || !submission) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Job or steps not found.</p>
        <Button variant="ghost" onClick={() => navigate("/")} className="mt-4">
          Back to Jobs
        </Button>
      </div>
    );
  }

  const handleSave = async (values: {
    answerText?: string;
    answerBool?: boolean;
    answerNumber?: number;
  }) => {
    if (!step) return;
    await saveAnswer.mutateAsync({
      submissionId: submission.id,
      stepId: step.id,
      ...values,
    });
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const canSubmit = answeredCount >= steps.filter((s) => s.is_required).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/jobs/${id}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <span className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </span>
      </div>

      <Progress value={progress} className="h-1.5" />

      <h2 className="text-lg font-semibold text-foreground">{job.title}</h2>

      {/* Step Card */}
      {step && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{step.prompt}</CardTitle>
              {step.is_required && (
                <Badge variant="outline" className="text-[10px] border-red-200 text-red-500 flex-shrink-0">
                  Required
                </Badge>
              )}
            </div>
            {step.guidance_text && (
              <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {step.guidance_text}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Render by step_type */}
            {step.step_type === "yes_no" && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={currentAnswer?.answer_bool ?? false}
                  onCheckedChange={(checked) => handleSave({ answerBool: checked })}
                />
                <Label className="text-sm">
                  {currentAnswer?.answer_bool ? "Yes" : "No"}
                </Label>
              </div>
            )}

            {step.step_type === "text" && (
              <Textarea
                placeholder="Enter your answer..."
                defaultValue={currentAnswer?.answer_text ?? ""}
                onBlur={(e) => handleSave({ answerText: e.target.value })}
                rows={3}
              />
            )}

            {step.step_type === "number" && (
              <Input
                type="number"
                placeholder="Enter a number..."
                defaultValue={currentAnswer?.answer_number ?? ""}
                onBlur={(e) =>
                  handleSave({ answerNumber: parseFloat(e.target.value) || 0 })
                }
              />
            )}

            {step.step_type === "photo" && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Optional notes for this step..."
                  defaultValue={currentAnswer?.answer_text ?? ""}
                  onBlur={(e) => handleSave({ answerText: e.target.value })}
                  rows={2}
                />
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Photo upload will be available with signed URLs (Batch 3)
                  </p>
                  {(step.min_photos ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum {step.min_photos} photo(s) required
                    </p>
                  )}
                </div>
              </div>
            )}

            {step.step_type === "checklist" && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={currentAnswer?.answer_bool ?? false}
                  onCheckedChange={(checked) => handleSave({ answerBool: checked })}
                />
                <Label className="text-sm">
                  {currentAnswer?.answer_bool ? "Completed" : "Not completed"}
                </Label>
              </div>
            )}

            {/* Fallback for unknown types */}
            {!["yes_no", "text", "number", "photo", "checklist"].includes(step.step_type) && (
              <Textarea
                placeholder="Enter your response..."
                defaultValue={currentAnswer?.answer_text ?? ""}
                onBlur={(e) => handleSave({ answerText: e.target.value })}
                rows={3}
              />
            )}

            {/* Save indicator */}
            {saveAnswer.isPending && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </p>
            )}
            {currentAnswer && !saveAnswer.isPending && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={goPrev}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>

        {currentStep < totalSteps - 1 ? (
          <Button className="flex-1" onClick={goNext}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            className="flex-1"
            onClick={() => navigate(`/jobs/${id}/submit`)}
            disabled={!canSubmit}
          >
            Review & Submit
          </Button>
        )}
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-1.5 pt-2">
        {steps.map((s, i) => {
          const answered = answerMap.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => setCurrentStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === currentStep
                  ? "bg-primary"
                  : answered
                  ? "bg-primary/40"
                  : "bg-muted"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
