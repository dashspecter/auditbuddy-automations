import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTrainingProgram, useTrainingSteps } from "@/hooks/useTrainingPrograms";
import { useTrainingProgress } from "@/hooks/useTrainingProgress";
import { ArrowLeft, BookOpen, Clock, FileText, CheckSquare, ListChecks } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const TrainingProgramDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: program } = useTrainingProgram(id);
  const { data: steps } = useTrainingSteps(id);
  const { data: progressList } = useTrainingProgress({ programId: id });

  if (!program) {
    return (
      <AppLayout>
        <div className="text-center py-12">Loading program...</div>
      </AppLayout>
    );
  }

  const totalEnrolled = progressList?.length || 0;
  const completed = progressList?.filter(p => p.status === "completed").length || 0;
  const inProgress = progressList?.filter(p => p.status === "in_progress").length || 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/training")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Programs
          </Button>
          <Button onClick={() => navigate(`/training/${id}/assign`)}>
            Assign to Staff
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{program.name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      {program.is_mandatory && (
                        <Badge variant="destructive">Mandatory</Badge>
                      )}
                      {program.category && (
                        <Badge variant="secondary">{program.category}</Badge>
                      )}
                    </div>
                  </div>
                  {program.duration_hours && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{program.duration_hours}h</span>
                    </div>
                  )}
                </div>
                {program.description && (
                  <p className="text-muted-foreground mt-3">{program.description}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{totalEnrolled}</div>
                <div className="text-sm text-muted-foreground">Total Enrolled</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training Steps</CardTitle>
          </CardHeader>
          <CardContent>
            {steps && steps.length > 0 ? (
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-4 p-4 rounded-lg border"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{step.title}</h4>
                          {step.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {step.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {step.step_type === "document" && <FileText className="h-3 w-3 mr-1" />}
                            {step.step_type === "task" && <CheckSquare className="h-3 w-3 mr-1" />}
                            {step.step_type === "audit" && <ListChecks className="h-3 w-3 mr-1" />}
                            {step.step_type}
                          </Badge>
                          {step.is_required && (
                            <Badge variant="secondary">Required</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No training steps defined yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment & Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {progressList && progressList.length > 0 ? (
              <div className="space-y-4">
                {progressList.map((progress) => (
                  <div
                    key={progress.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{progress.employees?.full_name}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Progress value={progress.completion_percentage} className="h-2 w-48" />
                        <span className="text-sm text-muted-foreground">
                          {progress.completion_percentage}% complete
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        progress.status === "completed"
                          ? "default"
                          : progress.status === "in_progress"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {progress.status === "completed" && "Completed"}
                      {progress.status === "in_progress" && "In Progress"}
                      {progress.status === "not_started" && "Not Started"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No staff enrolled yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TrainingProgramDetail;