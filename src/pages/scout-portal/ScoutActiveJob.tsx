import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Loader2,
  Info,
  Upload,
  Image as ImageIcon,
  X,
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
import { useUploadScoutEvidence } from "@/hooks/useScoutEvidence";
import { useScoutMedia } from "@/hooks/useScoutSubmissions";

export default function ScoutActiveJob() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: job, isLoading: jobLoading } = useScoutJobDetail(id);
  const { data: steps, isLoading: stepsLoading } = useScoutJobSteps(id);
  const { data: submission } = useScoutSubmissionForJob(id);
  const { data: answers } = useScoutStepAnswers(submission?.id);
  const { data: allMedia } = useScoutMedia(submission?.id);
  const saveAnswer = useSaveStepAnswer();
  const uploadEvidence = useUploadScoutEvidence();

  const isLoading = jobLoading || stepsLoading;
  const totalSteps = steps?.length ?? 0;
  const step = steps?.[currentStep];

  const answerMap = useMemo(() => {
    const map = new Map<string, any>();
    answers?.forEach((a) => map.set(a.step_id, a));
    return map;
  }, [answers]);

  const mediaByStep = useMemo(() => {
    const map = new Map<string, any[]>();
    allMedia?.forEach((m) => {
      if (!map.has(m.step_id)) map.set(m.step_id, []);
      map.get(m.step_id)!.push(m);
    });
    return map;
  }, [allMedia]);

  const currentAnswer = step ? answerMap.get(step.id) : null;
  const currentMedia = step ? mediaByStep.get(step.id) ?? [] : [];
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !step) return;

    for (const file of Array.from(files)) {
      await uploadEvidence.mutateAsync({
        jobId: id!,
        stepId: step.id,
        submissionId: submission.id,
        file,
      });
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
  };
  const goPrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
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
                <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive flex-shrink-0">
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
            {/* yes_no */}
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

            {/* text */}
            {step.step_type === "text" && (
              <Textarea
                placeholder="Enter your answer..."
                defaultValue={currentAnswer?.answer_text ?? ""}
                onBlur={(e) => handleSave({ answerText: e.target.value })}
                rows={3}
              />
            )}

            {/* number */}
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

            {/* photo — now with real upload */}
            {step.step_type === "photo" && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Optional notes for this step..."
                  defaultValue={currentAnswer?.answer_text ?? ""}
                  onBlur={(e) => handleSave({ answerText: e.target.value })}
                  rows={2}
                />

                {/* Existing media thumbnails */}
                {currentMedia.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentMedia.map((m: any) => (
                      <div
                        key={m.id}
                        className="w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden border border-border"
                      >
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadEvidence.isPending}
                >
                  {uploadEvidence.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploadEvidence.isPending ? "Uploading..." : "Upload Photo / Video"}
                </Button>

                {(step.min_photos ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {currentMedia.length} / {step.min_photos} required photo(s)
                  </p>
                )}
              </div>
            )}

            {/* checklist */}
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

            {/* Fallback */}
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
        <Button variant="outline" className="flex-1" onClick={goPrev} disabled={currentStep === 0}>
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
