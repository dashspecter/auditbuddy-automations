import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { TestSubmission } from "@/hooks/useTestSubmissions";

interface Props {
  submissions: TestSubmission[];
  score: { tests_taken: number; tests_passed: number; average_test_score: number } | null;
}

export function TestsSection({ submissions, score }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-5 w-5 text-primary" />
          Tests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {score && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold">{score.tests_taken}</div>
              <div className="text-xs text-muted-foreground">Taken</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{score.tests_passed}</div>
              <div className="text-xs text-muted-foreground">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{score.average_test_score.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
            </div>
          </div>
        )}

        {submissions.length > 0 ? (
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {submissions.slice(0, 15).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between text-xs border rounded px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{sub.tests?.title || "Test"}</span>
                  {sub.completed_at && (
                    <span className="text-muted-foreground">{format(parseISO(sub.completed_at), "MMM d")}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{sub.score !== null ? `${sub.score}%` : "—"}</span>
                  {sub.passed !== null && (
                    <Badge variant={sub.passed ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                      {sub.passed ? "Pass" : "Fail"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tests taken.</p>
        )}
      </CardContent>
    </Card>
  );
}
