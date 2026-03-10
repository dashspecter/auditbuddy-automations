import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ListTodo } from "lucide-react";
import type { EffectiveEmployeeScore } from "@/lib/effectiveScore";

interface Props {
  score: EffectiveEmployeeScore | null;
}

export function TasksSection({ score }: Props) {
  if (!score) return null;

  const completionRate = score.tasks_assigned > 0
    ? Math.round((score.tasks_completed / score.tasks_assigned) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-5 w-5 text-primary" />
          Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPI label="Assigned" value={score.tasks_assigned} />
          <KPI label="Completed" value={score.tasks_completed} />
          <KPI label="On Time" value={score.tasks_completed_on_time} />
          <KPI label="Overdue" value={score.tasks_overdue} variant={score.tasks_overdue > 0 ? "destructive" : "default"} />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Completion Rate</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        <div className="text-sm text-muted-foreground">
          Task Score: <span className="font-medium text-foreground">{score.task_score.toFixed(1)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function KPI({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "destructive" }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${variant === "destructive" ? "text-destructive" : "text-foreground"}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
