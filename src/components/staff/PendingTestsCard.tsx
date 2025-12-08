import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTestAssignments } from "@/hooks/useTestAssignments";
import { useTestSubmissions } from "@/hooks/useTestSubmissions";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PendingTestsCardProps {
  employeeId: string;
}

export const PendingTestsCard = ({ employeeId }: PendingTestsCardProps) => {
  const navigate = useNavigate();
  const { data: assignments = [], isLoading: assignmentsLoading } = useTestAssignments(undefined, employeeId);
  const { data: submissions = [], isLoading: submissionsLoading } = useTestSubmissions(employeeId);

  const isLoading = assignmentsLoading || submissionsLoading;

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  const pendingTests = assignments.filter((a) => !a.completed);
  const recentSubmissions = submissions.slice(0, 3);

  if (pendingTests.length === 0 && recentSubmissions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Pending Tests */}
      {pendingTests.length > 0 && (
        <Card className="p-4 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900 dark:text-orange-100">Pending Tests</h3>
            <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100">
              {pendingTests.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {pendingTests.slice(0, 3).map((assignment: any) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{assignment.tests?.title || "Test"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Assigned {format(new Date(assignment.assigned_at), "MMM d")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/t/${assignment.short_code}`)}
                >
                  Take Test
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Test Results */}
      {recentSubmissions.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recent Test Results</h3>
          </div>
          <div className="space-y-2">
            {recentSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      submission.passed
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-red-100 dark:bg-red-900"
                    }`}
                  >
                    <span
                      className={`font-bold text-sm ${
                        submission.passed
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {submission.score}%
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{submission.tests?.title || "Test"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(submission.completed_at!), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <Badge variant={submission.passed ? "default" : "destructive"}>
                  {submission.passed ? "Passed" : "Failed"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
