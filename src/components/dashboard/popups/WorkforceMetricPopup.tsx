import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface EmployeeScore {
  employee_id: string;
  employee_name: string;
  avatar_url?: string | null;
  location_name: string;
  overall_score: number;
  attendance_score: number;
  punctuality_score: number;
  task_score: number;
  test_score: number;
  tests_taken: number;
  tests_passed: number;
  late_count: number;
  shifts_missed: number;
  tasks_overdue: number;
  warning_count: number;
  warning_penalty: number;
}

type MetricType = "activeStaff" | "avgPerformance" | "lateArrivals" | "warnings" | "atRisk" | "attendance" | "punctuality" | "taskCompletion" | "testPerformance";

interface WorkforceMetricPopupProps {
  metric: MetricType;
  allScores: EmployeeScore[];
}

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 70) return "text-blue-600 dark:text-blue-400";
  if (score >= 50) return "text-warning";
  return "text-destructive";
};

export const WorkforceMetricPopup = ({ metric, allScores }: WorkforceMetricPopupProps) => {
  const { t } = useTranslation();

  const renderEmployeeRow = (emp: EmployeeScore, detail: string, score?: number) => (
    <div key={emp.employee_id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
      <Avatar className="h-8 w-8">
        <AvatarImage src={emp.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {emp.employee_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{emp.employee_name}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {score !== undefined && (
        <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}%</span>
      )}
    </div>
  );

  switch (metric) {
    case "activeStaff": {
      const top = allScores.filter(s => s.overall_score >= 90);
      const mid = allScores.filter(s => s.overall_score >= 50 && s.overall_score < 90);
      const low = allScores.filter(s => s.overall_score < 50);
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-green-500/10">
              <div className="text-2xl font-bold text-green-600">{top.length}</div>
              <p className="text-xs text-muted-foreground">Top (90%+)</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <div className="text-2xl font-bold text-blue-600">{mid.length}</div>
              <p className="text-xs text-muted-foreground">Mid (50-89%)</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10">
              <div className="text-2xl font-bold text-destructive">{low.length}</div>
              <p className="text-xs text-muted-foreground">At Risk (&lt;50%)</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">{allScores.length} total active employees</p>
        </div>
      );
    }

    case "avgPerformance": {
      const avg = allScores.length > 0 ? Math.round(allScores.reduce((s, e) => s + e.overall_score, 0) / allScores.length) : 0;
      const topList = [...allScores].sort((a, b) => b.overall_score - a.overall_score).slice(0, 5);
      return (
        <div className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-primary/10">
            <div className={`text-4xl font-bold ${getScoreColor(avg)}`}>{avg}%</div>
            <p className="text-sm text-muted-foreground mt-1">Average Performance Score</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Top 5 Performers</p>
            {topList.map(emp => renderEmployeeRow(emp, emp.location_name, emp.overall_score))}
          </div>
        </div>
      );
    }

    case "lateArrivals": {
      const lateEmployees = [...allScores].filter(s => s.late_count > 0).sort((a, b) => b.late_count - a.late_count).slice(0, 5);
      const totalLate = allScores.reduce((s, e) => s + e.late_count, 0);
      return (
        <div className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-warning/10">
            <div className="text-4xl font-bold text-warning">{totalLate}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Late Arrivals</p>
          </div>
          {lateEmployees.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Most Late Arrivals</p>
              {lateEmployees.map(emp => renderEmployeeRow(emp, `${emp.late_count} late arrivals`, emp.punctuality_score))}
            </div>
          )}
        </div>
      );
    }

    case "warnings": {
      const warned = [...allScores].filter(s => s.warning_count > 0).sort((a, b) => b.warning_count - a.warning_count).slice(0, 5);
      const totalW = allScores.reduce((s, e) => s + e.warning_count, 0);
      const totalPenalty = allScores.reduce((s, e) => s + e.warning_penalty, 0);
      return (
        <div className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-warning/10">
            <div className="text-4xl font-bold text-warning">{totalW}</div>
            <p className="text-sm text-muted-foreground mt-1">Active Warnings ({warned.length} employees)</p>
            <p className="text-xs text-destructive mt-1">-{totalPenalty.toFixed(1)} pts total penalty</p>
          </div>
          {warned.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employees with Warnings</p>
              {warned.map(emp => renderEmployeeRow(emp, `${emp.warning_count} warnings • -${emp.warning_penalty.toFixed(1)} pts`, emp.overall_score))}
            </div>
          )}
        </div>
      );
    }

    case "atRisk": {
      const atRisk = [...allScores].filter(s => s.overall_score < 50).sort((a, b) => a.overall_score - b.overall_score).slice(0, 5);
      return (
        <div className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-destructive/10">
            <div className="text-4xl font-bold text-destructive">{atRisk.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Employees Below 50%</p>
          </div>
          {atRisk.length > 0 ? (
            <div className="space-y-2">
              {atRisk.map(emp => renderEmployeeRow(emp, `${emp.shifts_missed} missed • ${emp.late_count} late • ${emp.tasks_overdue} overdue`, emp.overall_score))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">✅ No employees at risk</p>
          )}
        </div>
      );
    }

    case "attendance": {
      const avg = allScores.length > 0 ? Math.round(allScores.reduce((s, e) => s + e.attendance_score, 0) / allScores.length) : 0;
      const totalMissed = allScores.reduce((s, e) => s + e.shifts_missed, 0);
      const worst = [...allScores].sort((a, b) => a.attendance_score - b.attendance_score).slice(0, 5);
      return (
        <div className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-primary/10">
            <div className={`text-4xl font-bold ${getScoreColor(avg)}`}>{avg}%</div>
            <p className="text-sm text-muted-foreground mt-1">{totalMissed} missed shifts total</p>
          </div>
          <div className="space-y-1">
            <Progress value={avg} className="h-2" />
          </div>
          {worst.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lowest Attendance</p>
              {worst.map(emp => renderEmployeeRow(emp, `${emp.shifts_missed} missed shifts`, emp.attendance_score))}
            </div>
          )}
        </div>
      );
    }

    case "punctuality": {
      const avg = allScores.length > 0 ? Math.round(allScores.reduce((s, e) => s + e.punctuality_score, 0) / allScores.length) : 0;
      const totalLate = allScores.reduce((s, e) => s + e.late_count, 0);
      const worst = [...allScores].filter(s => s.late_count > 0).sort((a, b) => a.punctuality_score - b.punctuality_score).slice(0, 5);
      return (
        <div className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-primary/10">
            <div className={`text-4xl font-bold ${getScoreColor(avg)}`}>{avg}%</div>
            <p className="text-sm text-muted-foreground mt-1">{totalLate} late arrivals total</p>
          </div>
          <Progress value={avg} className="h-2" />
          {worst.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Least Punctual</p>
              {worst.map(emp => renderEmployeeRow(emp, `${emp.late_count} late arrivals`, emp.punctuality_score))}
            </div>
          )}
        </div>
      );
    }

    case "taskCompletion": {
      const avg = allScores.length > 0 ? Math.round(allScores.reduce((s, e) => s + e.task_score, 0) / allScores.length) : 0;
      const totalOverdue = allScores.reduce((s, e) => s + e.tasks_overdue, 0);
      const worst = [...allScores].filter(s => s.tasks_overdue > 0).sort((a, b) => b.tasks_overdue - a.tasks_overdue).slice(0, 5);
      return (
        <div className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-primary/10">
            <div className={`text-4xl font-bold ${getScoreColor(avg)}`}>{avg}%</div>
            <p className="text-sm text-muted-foreground mt-1">{totalOverdue} overdue tasks total</p>
          </div>
          <Progress value={avg} className="h-2" />
          {worst.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Most Overdue</p>
              {worst.map(emp => renderEmployeeRow(emp, `${emp.tasks_overdue} overdue tasks`, emp.task_score))}
            </div>
          )}
        </div>
      );
    }

    case "testPerformance": {
      const avg = allScores.length > 0 ? Math.round(allScores.reduce((s, e) => s + e.test_score, 0) / allScores.length) : 0;
      const totalTaken = allScores.reduce((s, e) => s + e.tests_taken, 0);
      const totalPassed = allScores.reduce((s, e) => s + e.tests_passed, 0);
      const worst = [...allScores].filter(s => s.tests_taken > 0).sort((a, b) => a.test_score - b.test_score).slice(0, 5);
      return (
        <div className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-primary/10">
            <div className={`text-4xl font-bold ${getScoreColor(avg)}`}>{avg}%</div>
            <p className="text-sm text-muted-foreground mt-1">{totalPassed}/{totalTaken} tests passed</p>
          </div>
          <Progress value={avg} className="h-2" />
          {worst.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lowest Test Scores</p>
              {worst.map(emp => renderEmployeeRow(emp, `${emp.tests_passed}/${emp.tests_taken} passed`, emp.test_score))}
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
};
