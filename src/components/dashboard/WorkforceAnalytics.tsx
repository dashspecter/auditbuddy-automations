import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Users, Clock, CheckCircle, TrendingUp, TrendingDown, AlertTriangle, MapPin, Calendar, FileText } from "lucide-react";
import { usePerformanceLeaderboard, EmployeePerformanceScore } from "@/hooks/useEmployeePerformance";
import { usePayrollSummary } from "@/hooks/usePayroll";
import { format, startOfMonth, endOfMonth, subMonths, subWeeks } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { useState } from "react";

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
};

const getScoreBgColor = (score: number) => {
  if (score >= 90) return "bg-green-100";
  if (score >= 70) return "bg-blue-100";
  if (score >= 50) return "bg-yellow-100";
  return "bg-red-100";
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground text-sm">#{rank}</span>;
  }
};

interface WorkforceAnalyticsProps {
  locationId?: string;
  period?: "week" | "month" | "quarter";
  showDateFilter?: boolean;
}

export const WorkforceAnalytics = ({ locationId, period = "month", showDateFilter = true }: WorkforceAnalyticsProps) => {
  // Initialize date range based on period prop
  const getInitialDateRange = () => {
    const now = new Date();
    switch (period) {
      case "week":
        return { from: subWeeks(now, 1), to: now };
      case "month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "quarter":
        return { from: subMonths(now, 3), to: now };
      default:
        return { from: subMonths(now, 1), to: now };
    }
  };

  const initialRange = getInitialDateRange();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(initialRange.from);
  const [dateTo, setDateTo] = useState<Date | undefined>(initialRange.to);

  const startDate = dateFrom ? format(dateFrom, "yyyy-MM-dd") : format(subMonths(new Date(), 1), "yyyy-MM-dd");
  const endDate = dateTo ? format(dateTo, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  
  const { leaderboard, allScores, isLoading: performanceLoading } = usePerformanceLeaderboard(
    startDate,
    endDate,
    locationId,
    10
  );

  const { data: payrollSummary = [], isLoading: payrollLoading } = usePayrollSummary(
    startDate,
    endDate,
    locationId
  );

  // Calculate aggregate stats
  const avgPerformanceScore = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s.overall_score, 0) / allScores.length)
    : 0;

  const avgAttendanceScore = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s.attendance_score, 0) / allScores.length)
    : 0;

  const avgPunctualityScore = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s.punctuality_score, 0) / allScores.length)
    : 0;

  const avgTaskScore = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s.task_score, 0) / allScores.length)
    : 0;

  const avgTestScore = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s.test_score, 0) / allScores.length)
    : 0;

  const totalTestsTaken = allScores.reduce((sum, s) => sum + s.tests_taken, 0);
  const totalTestsPassed = allScores.reduce((sum, s) => sum + s.tests_passed, 0);

  const totalLateArrivals = allScores.reduce((sum, s) => sum + s.late_count, 0);
  const totalMissedShifts = allScores.reduce((sum, s) => sum + s.shifts_missed, 0);
  const totalTasksOverdue = allScores.reduce((sum, s) => sum + s.tasks_overdue, 0);

  const topPerformers = allScores.filter(s => s.overall_score >= 90).length;
  const atRiskEmployees = allScores.filter(s => s.overall_score < 50).length;

  // Warning stats
  const totalWarnings = allScores.reduce((sum, s) => sum + (s.warning_count || 0), 0);
  const totalWarningPenalty = allScores.reduce((sum, s) => sum + (s.warning_penalty || 0), 0);
  const employeesWithWarnings = allScores.filter(s => (s.warning_count || 0) > 0).length;

  if (performanceLoading || payrollLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showDateFilter && (
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
      )}
      
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allScores.length}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                {topPerformers} top performers
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(avgPerformanceScore)}`}>
              {avgPerformanceScore}
            </div>
            <Progress value={avgPerformanceScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Late Arrivals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalLateArrivals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg punctuality: {avgPunctualityScore}%
            </p>
          </CardContent>
        </Card>

        <Card className={totalWarnings > 0 ? "border-orange-200" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Active Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalWarnings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {employeesWithWarnings} employees • -{totalWarningPenalty.toFixed(1)} pts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{atRiskEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Employees below 50%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Score Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{avgAttendanceScore}%</span>
              <span className="text-sm text-muted-foreground">
                {totalMissedShifts} missed shifts
              </span>
            </div>
            <Progress value={avgAttendanceScore} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Punctuality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{avgPunctualityScore}%</span>
              <span className="text-sm text-muted-foreground">
                {totalLateArrivals} late arrivals
              </span>
            </div>
            <Progress value={avgPunctualityScore} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Task Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{avgTaskScore}%</span>
              <span className="text-sm text-muted-foreground">
                {totalTasksOverdue} overdue
              </span>
            </div>
            <Progress value={avgTaskScore} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              Test Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{avgTestScore}%</span>
              <span className="text-sm text-muted-foreground">
                {totalTestsPassed}/{totalTestsTaken} passed
              </span>
            </div>
            <Progress value={avgTestScore} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Performers
          </CardTitle>
          <CardDescription>
            Highest performing employees this period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No performance data available for this period
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((employee, index) => (
                <div key={employee.employee_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                  <div className="w-6">{getRankIcon(index + 1)}</div>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={employee.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {employee.employee_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{employee.employee_name}</span>
                      {employee.warning_count > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-orange-50 text-orange-700 border-orange-200">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          {employee.warning_count}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {employee.location_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                      <span className={getScoreColor(employee.attendance_score)}>
                        A:{employee.attendance_score}
                      </span>
                      <span className={getScoreColor(employee.punctuality_score)}>
                        P:{employee.punctuality_score}
                      </span>
                      <span className={getScoreColor(employee.task_score)}>
                        T:{employee.task_score}
                      </span>
                      {employee.warning_penalty > 0 && (
                        <span className="text-orange-600">
                          W:-{employee.warning_penalty.toFixed(0)}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getScoreBgColor(employee.overall_score)}`}>
                      <span className={`font-bold ${getScoreColor(employee.overall_score)}`}>
                        {employee.overall_score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employees Needing Attention */}
      {atRiskEmployees > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <TrendingDown className="h-5 w-5" />
              Employees Needing Attention
            </CardTitle>
            <CardDescription>
              Staff with performance scores below 50%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allScores
                .filter(s => s.overall_score < 50)
                .sort((a, b) => a.overall_score - b.overall_score)
                .slice(0, 5)
                .map((employee) => (
                  <div key={employee.employee_id} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={employee.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {employee.employee_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{employee.employee_name}</span>
                        {employee.warning_count > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 text-orange-700 border-orange-300">
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                            {employee.warning_count} warnings
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {employee.shifts_missed} missed shifts • {employee.late_count} late • {employee.tasks_overdue} overdue tasks
                        {employee.warning_penalty > 0 && (
                          <span className="text-orange-600 ml-1">• -{employee.warning_penalty.toFixed(1)} warning penalty</span>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getScoreBgColor(employee.overall_score)}`}>
                      <span className={`font-bold ${getScoreColor(employee.overall_score)}`}>
                        {employee.overall_score}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
