import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TierDistributionCard } from "@/components/workforce/TierDistributionCard";
import { ScoringExplainerCard } from "@/components/workforce/ScoringExplainerCard";
import { BadgeManagement } from "@/components/workforce/BadgeManagement";
import { TierBadge } from "@/components/staff/TierBadge";
import { computeEarnedBadges } from "@/lib/performanceBadges";
import { useMonthlyScores } from "@/hooks/useMonthlyScores";
import { useBadgeConfigurations } from "@/hooks/useBadgeConfigurations";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, TrendingUp, Clock, CheckCircle, Calendar, MapPin, ChevronDown, ChevronRight, Users, FileText, Star, AlertTriangle, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePerformanceLeaderboard } from "@/hooks/useEmployeePerformance";
import { useLocations } from "@/hooks/useLocations";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  computeEffectiveScores, 
  sortByEffectiveScore, 
  formatEffectiveScore, 
  formatComponentScore,
  calculateAverageEffectiveScore,
  EffectiveEmployeeScore 
} from "@/lib/effectiveScore";

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

const getProgressColor = (score: number) => {
  if (score >= 90) return "bg-green-500";
  if (score >= 70) return "bg-blue-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Medal className="h-6 w-6 text-amber-600" />;
    default:
      return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-medium">#{rank}</span>;
  }
};

/** Small sub-component that fetches monthly history + renders earned badges for one employee */
function EmployeeBadgesRow({ employee, badgeConfigs }: { employee: EffectiveEmployeeScore; badgeConfigs?: import("@/hooks/useBadgeConfigurations").BadgeConfigRow[] }) {
  const { data: monthlyHistory = [] } = useMonthlyScores(employee.employee_id, 6);

  const badges = useMemo(() => {
    const history = monthlyHistory.map(h => ({
      month: h.month,
      effective_score: h.effective_score !== null ? Number(h.effective_score) : null,
      rank_in_location: h.rank_in_location,
    }));
    return computeEarnedBadges(employee, history, null, badgeConfigs);
  }, [employee, monthlyHistory, badgeConfigs]);

  if (badges.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">No badges earned this month</div>
    );
  }

  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-1.5">Earned Badges</div>
      <div className="flex flex-wrap gap-2">
        {badges.map(badge => {
          const Icon = badge.icon;
          return (
            <div
              key={badge.key}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 bg-accent/5"
            >
              <Icon className={cn("h-3.5 w-3.5", badge.color)} />
              <span className="text-xs font-medium">{badge.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EmployeePerformance = () => {
  const { t } = useTranslation();
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("month");
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const { data: locations = [] } = useLocations();
  const { configs: badgeConfigs } = useBadgeConfigurations();

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "week":
        return {
          start: format(subDays(now, 7), "yyyy-MM-dd"),
          end: format(now, "yyyy-MM-dd"),
        };
      case "month":
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
        };
      case "quarter":
        return {
          start: format(subDays(now, 90), "yyyy-MM-dd"),
          end: format(now, "yyyy-MM-dd"),
        };
      default:
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
        };
    }
  };

  const { start: startDate, end: endDate } = getDateRange();
  const { leaderboard: rawLeaderboard, byLocation: rawByLocation, allScores: rawAllScores, isLoading } = usePerformanceLeaderboard(
    startDate,
    endDate,
    selectedLocationId === "all" ? undefined : selectedLocationId,
    100
  );

  // Compute effective scores for all employees
  const effectiveScores = useMemo(() => 
    sortByEffectiveScore(computeEffectiveScores(rawAllScores)), 
    [rawAllScores]
  );

  // Filter to top 20 for leaderboard
  const leaderboard = effectiveScores.slice(0, 20);

  // Group by location with effective scores
  const byLocation = useMemo(() => {
    const grouped: Record<string, { location_id: string; location_name: string; employees: EffectiveEmployeeScore[] }> = {};
    for (const score of effectiveScores) {
      if (!grouped[score.location_id]) {
        grouped[score.location_id] = {
          location_id: score.location_id,
          location_name: score.location_name,
          employees: [],
        };
      }
      grouped[score.location_id].employees.push(score);
    }
    return Object.values(grouped);
  }, [effectiveScores]);

  // Use effectiveScores for all calculations
  const allScores = effectiveScores;

  const toggleEmployee = (employeeId: string) => {
    setExpandedEmployee(expandedEmployee === employeeId ? null : employeeId);
  };

  const renderEmployeeCard = (employee: EffectiveEmployeeScore, rank: number) => {
    const isExpanded = expandedEmployee === employee.employee_id;

    return (
      <Collapsible key={employee.employee_id} open={isExpanded}>
        <CollapsibleTrigger asChild>
          <div
            className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer rounded-lg transition-colors"
            onClick={() => toggleEmployee(employee.employee_id)}
          >
            <div className="flex-shrink-0 w-8">
              {getRankIcon(rank)}
            </div>
            
            <Avatar className="h-10 w-10">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback>
                {employee.employee_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{employee.employee_name}</span>
                <TierBadge score={employee.effective_score} size="sm" showLabel={false} />
                <Badge variant="outline" className="text-xs">{employee.role}</Badge>
                {(employee.warning_count || 0) > 0 && (
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
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-center min-w-[60px]">
                  <div className="text-xs text-muted-foreground">Attendance</div>
                  <div className={`font-medium ${employee.attendance_used ? getScoreColor(employee.attendance_score) : 'text-muted-foreground'}`}>
                    {formatComponentScore(employee.attendance_score, employee.attendance_used)}
                  </div>
                </div>
                <div className="text-center min-w-[60px]">
                  <div className="text-xs text-muted-foreground">Punctuality</div>
                  <div className={`font-medium ${employee.punctuality_used ? getScoreColor(employee.punctuality_score) : 'text-muted-foreground'}`}>
                    {formatComponentScore(employee.punctuality_score, employee.punctuality_used)}
                  </div>
                </div>
                <div className="text-center min-w-[50px]">
                  <div className="text-xs text-muted-foreground">Tasks</div>
                  <div className={`font-medium ${employee.task_used ? getScoreColor(employee.task_score) : 'text-muted-foreground'}`}>
                    {formatComponentScore(employee.task_score, employee.task_used)}
                  </div>
                </div>
                <div className="text-center min-w-[45px]">
                  <div className="text-xs text-muted-foreground">Tests</div>
                  <div className={`font-medium ${employee.test_used ? getScoreColor(employee.test_score) : 'text-muted-foreground'}`}>
                    {formatComponentScore(employee.test_score, employee.test_used)}
                  </div>
                </div>
                <div className="text-center min-w-[55px]">
                  <div className="text-xs text-muted-foreground">Reviews</div>
                  <div className={`font-medium ${employee.review_used ? getScoreColor(employee.performance_review_score) : 'text-muted-foreground'}`}>
                    {formatComponentScore(employee.performance_review_score, employee.review_used)}
                  </div>
                </div>
              </div>
              
              <div className={`flex items-center justify-center w-14 h-14 rounded-full ${employee.effective_score !== null ? getScoreBgColor(employee.effective_score) : 'bg-muted'}`}>
                <span className={`text-lg font-bold ${employee.effective_score !== null ? getScoreColor(employee.effective_score) : 'text-muted-foreground'}`}>
                  {formatEffectiveScore(employee.effective_score)}
                </span>
              </div>
              
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 ml-12 space-y-4">
            {/* Score breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Attendance
                  </span>
                  <span className={`font-medium ${getScoreColor(employee.attendance_score)}`}>
                    {employee.attendance_score.toFixed(1)}/100
                  </span>
                </div>
                <Progress 
                  value={employee.attendance_score} 
                  className={`h-2 [&>div]:${getProgressColor(employee.attendance_score)}`}
                />
                <div className="text-xs text-muted-foreground">
                  {employee.shifts_worked}/{employee.shifts_scheduled} shifts worked
                  {employee.shifts_missed > 0 && (
                    <span className="text-red-600 ml-1">
                      ({employee.shifts_missed} missed)
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Punctuality
                  </span>
                  <span className={`font-medium ${getScoreColor(employee.punctuality_score)}`}>
                    {employee.punctuality_score.toFixed(1)}/100
                  </span>
                </div>
                <Progress 
                  value={employee.punctuality_score} 
                  className={`h-2 [&>div]:${getProgressColor(employee.punctuality_score)}`}
                />
                <div className="text-xs text-muted-foreground">
                  {employee.late_count > 0 ? (
                    <>
                      {employee.late_count} late arrivals ({employee.total_late_minutes} min total)
                    </>
                  ) : (
                    "No late arrivals"
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Tasks
                  </span>
                  <span className={`font-medium ${getScoreColor(employee.task_score)}`}>
                    {employee.task_score.toFixed(1)}/100
                  </span>
                </div>
                <Progress 
                  value={employee.task_score} 
                  className={`h-2 [&>div]:${getProgressColor(employee.task_score)}`}
                />
                <div className="text-xs text-muted-foreground">
                  {employee.tasks_completed_on_time}/{employee.tasks_assigned} completed on time
                  {employee.tasks_overdue > 0 && (
                    <span className="text-red-600 ml-1">
                      ({employee.tasks_overdue} overdue)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-purple-500" />
                    Tests
                  </span>
                  <span className={`font-medium ${getScoreColor(employee.test_score)}`}>
                    {employee.test_score.toFixed(1)}/100
                  </span>
                </div>
                <Progress 
                  value={employee.test_score} 
                  className={`h-2 [&>div]:${getProgressColor(employee.test_score)}`}
                />
                <div className="text-xs text-muted-foreground">
                  {employee.tests_taken > 0 ? (
                    <>
                      {employee.tests_passed}/{employee.tests_taken} passed (avg: {employee.average_test_score.toFixed(1)}%)
                    </>
                  ) : (
                    "No tests taken"
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Reviews
                  </span>
                  <span className={`font-medium ${getScoreColor(employee.performance_review_score)}`}>
                    {employee.performance_review_score.toFixed(1)}/100
                  </span>
                </div>
                <Progress 
                  value={employee.performance_review_score} 
                  className={`h-2 [&>div]:${getProgressColor(employee.performance_review_score)}`}
                />
                <div className="text-xs text-muted-foreground">
                  {employee.reviews_count > 0 ? (
                    <>
                      {employee.reviews_count} reviews (avg: {employee.average_review_score.toFixed(1)}%)
                    </>
                  ) : (
                    "No reviews"
                  )}
                </div>
              </div>
            </div>

            {/* Warning Penalty Section */}
            {(employee.warning_count > 0 || employee.warning_penalty > 0) && (
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800 dark:text-orange-200">
                    {t("warnings.warningsImpact", "Warnings Impact")}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {employee.warning_count} {t("warnings.warningCount", "warnings (last 90d)")}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("warnings.baseScore", "Base Score")}:</span>
                    <span className="ml-2 font-medium">{employee.base_score?.toFixed(1) || '100.0'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("warnings.warningsImpact", "Warnings")}:</span>
                    <span className="ml-2 font-medium text-red-600">-{employee.warning_penalty?.toFixed(1) || '0.0'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("warnings.finalScore", "Final Score")}:</span>
                    <span className={`ml-2 font-bold ${getScoreColor(employee.overall_score)}`}>{employee.overall_score.toFixed(1)}</span>
                  </div>
                </div>
                {employee.warning_monthly_caps && Object.entries(employee.warning_monthly_caps).some(([_, v]) => (v as { raw: number; capped: number }).raw > (v as { raw: number; capped: number }).capped) && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                    <Info className="h-3 w-3" />
                    {t("warnings.monthlyCap", "Monthly cap applied")}
                  </div>
                )}
              </div>
            )}

            {/* Earned Badges */}
            <EmployeeBadgesRow employee={employee} badgeConfigs={badgeConfigs.length > 0 ? badgeConfigs : undefined} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employee Performance</h1>
          <p className="text-muted-foreground">
            Track and compare employee performance scores
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="quarter">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scoring Explainer */}
      <ScoringExplainerCard />

      {/* Badge Management for admins */}
      <BadgeManagement />

      {/* Tier Distribution */}
      <TierDistributionCard scores={allScores} />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{allScores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    const avgScore = calculateAverageEffectiveScore(allScores);
                    return avgScore !== null ? avgScore.toFixed(1) : '—';
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold truncate">
                  {leaderboard[0]?.employee_name || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={allScores.reduce((sum, s) => sum + (s.warning_count || 0), 0) > 0 ? "border-orange-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Warnings</p>
                <p className="text-2xl font-bold text-orange-600">
                  {allScores.reduce((sum, s) => sum + (s.warning_count || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {allScores.filter(s => (s.warning_count || 0) > 0).length} employees
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">90+ Scorers</p>
                <p className="text-2xl font-bold">
                  {allScores.filter(s => s.effective_score !== null && s.effective_score >= 90).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leaderboard">Company Leaderboard</TabsTrigger>
          <TabsTrigger value="by-location">By Location</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Performance Leaderboard
              </CardTitle>
              <CardDescription>
                {format(parseISO(startDate), "MMM d")} - {format(parseISO(endDate), "MMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-14 w-14 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No performance data available for this period
                </div>
              ) : (
                <div className="divide-y">
                  {leaderboard.map((employee, index) =>
                    renderEmployeeCard(employee, index + 1)
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-location">
          <div className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            ) : byLocation.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    No performance data available for this period
                  </div>
                </CardContent>
              </Card>
            ) : (
              byLocation.map((locationData) => {
                const locationAvg = calculateAverageEffectiveScore(locationData.employees);
                return (
                  <Card key={locationData.location_id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {locationData.location_name}
                      </CardTitle>
                      <CardDescription>
                        {locationData.employees.length} employees •{" "}
                        Avg score:{" "}
                        {locationAvg !== null ? Math.round(locationAvg) : '—'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y">
                        {locationData.employees
                          .slice(0, 10)
                          .map((employee, index) =>
                            renderEmployeeCard(employee, index + 1)
                          )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeePerformance;
