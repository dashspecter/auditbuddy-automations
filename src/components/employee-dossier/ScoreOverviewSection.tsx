import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TierBadge } from "@/components/staff/TierBadge";
import { formatEffectiveScore, formatComponentScore, EffectiveEmployeeScore } from "@/lib/effectiveScore";
import { Award, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  score: EffectiveEmployeeScore;
}

const componentLabels = [
  { key: "attendance", label: "Attendance", scoreKey: "attendance_score", usedKey: "attendance_used" },
  { key: "punctuality", label: "Punctuality", scoreKey: "punctuality_score", usedKey: "punctuality_used" },
  { key: "tasks", label: "Tasks", scoreKey: "task_score", usedKey: "task_used" },
  { key: "tests", label: "Tests", scoreKey: "test_score", usedKey: "test_used" },
  { key: "reviews", label: "Reviews", scoreKey: "performance_review_score", usedKey: "review_used" },
] as const;

function getScoreColor(score: number) {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
}

export function ScoreOverviewSection({ score }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-5 w-5 text-primary" />
          Score Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Effective score + tier */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={cn("text-4xl font-bold", score.effective_score !== null ? getScoreColor(score.effective_score) : "text-muted-foreground")}>
              {formatEffectiveScore(score.effective_score)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Effective Score</p>
          </div>
          <div className="flex flex-col gap-2">
            <TierBadge score={score.effective_score} size="md" />
            <span className="text-xs text-muted-foreground">
              {score.used_components_count} of 5 components active
            </span>
          </div>
        </div>

        {/* Warning penalty */}
        {score.warning_penalty > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">
              -{score.warning_penalty.toFixed(1)} warning penalty ({score.warning_count} warning{score.warning_count !== 1 ? "s" : ""})
            </span>
          </div>
        )}

        {/* Component breakdown */}
        <div className="space-y-3">
          {componentLabels.map((comp) => {
            const val = score[comp.scoreKey as keyof typeof score] as number;
            const used = score[comp.usedKey as keyof typeof score] as boolean;
            return (
              <div key={comp.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={cn(!used && "text-muted-foreground")}>{comp.label}</span>
                  <span className={cn("font-medium", !used && "text-muted-foreground")}>
                    {formatComponentScore(val, used)}
                  </span>
                </div>
                <Progress value={used ? val : 0} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
