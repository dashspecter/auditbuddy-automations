import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { ArrowLeft, CheckCircle2, Clock, ListTodo, GraduationCap, Star, AlertTriangle, Lightbulb } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useEmployeePerformance } from "@/hooks/useEmployeePerformance";
import { computeEffectiveScore, formatEffectiveScore, type EffectiveEmployeeScore } from "@/lib/effectiveScore";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TierBadge } from "@/components/staff/TierBadge";
import { BadgesSection } from "@/components/staff/BadgesSection";
import { ScoreHistoryChart } from "@/components/staff/ScoreHistoryChart";
import { useMonthlyScores } from "@/hooks/useMonthlyScores";
import { computeEarnedBadges, type MonthlyScoreRecord } from "@/lib/performanceBadges";
import { computeKioskLeaderboardScores } from "@/lib/kioskEffectiveScore";
import { useBadgeConfigurations } from "@/hooks/useBadgeConfigurations";

const COMPONENTS = [
  { key: "attendance" as const, label: "Attendance", icon: CheckCircle2, scoreField: "attendance_score" as const, usedField: "attendance_used" as const, metricFn: (s: EffectiveEmployeeScore) => `${s.shifts_worked}/${s.shifts_scheduled} shifts worked` },
  { key: "punctuality" as const, label: "Punctuality", icon: Clock, scoreField: "punctuality_score" as const, usedField: "punctuality_used" as const, metricFn: (s: EffectiveEmployeeScore) => s.late_count > 0 ? `${s.late_count} late arrival${s.late_count > 1 ? 's' : ''} (${s.total_late_minutes} min)` : "No late arrivals" },
  { key: "tasks" as const, label: "Tasks", icon: ListTodo, scoreField: "task_score" as const, usedField: "task_used" as const, metricFn: (s: EffectiveEmployeeScore) => `${s.tasks_completed_on_time}/${s.tasks_assigned} on time` },
  { key: "tests" as const, label: "Tests", icon: GraduationCap, scoreField: "test_score" as const, usedField: "test_used" as const, metricFn: (s: EffectiveEmployeeScore) => `${s.tests_passed}/${s.tests_taken} passed (avg ${s.average_test_score.toFixed(0)}%)` },
  { key: "reviews" as const, label: "Reviews", icon: Star, scoreField: "performance_review_score" as const, usedField: "review_used" as const, metricFn: (s: EffectiveEmployeeScore) => `${s.reviews_count} review${s.reviews_count > 1 ? 's' : ''} (avg ${s.average_review_score.toFixed(0)}%)` },
];

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getProgressColor(score: number): string {
  if (score >= 80) return "[&>div]:bg-green-500";
  if (score >= 60) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

function getImprovementTip(score: EffectiveEmployeeScore): string | null {
  const active = COMPONENTS.filter(c => score[c.usedField]);
  if (active.length === 0) return null;
  
  const weakest = active.reduce((min, c) => 
    score[c.scoreField] < score[min.scoreField] ? c : min
  , active[0]);

  const tips: Record<string, string> = {
    attendance: "Try not to miss any scheduled shifts to boost your Attendance score.",
    punctuality: "Arriving on time consistently will improve your Punctuality score.",
    tasks: "Completing tasks before their deadline raises your Tasks score.",
    tests: "Study and retake tests to improve your Tests score.",
    reviews: "Focus on the feedback from your reviews to raise that score.",
  };

  return tips[weakest.key] || null;
}

const StaffScoreBreakdown = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("employees")
      .select("id, location_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setEmployeeId(data?.id || null);
        setLocationId(data?.location_id || null);
      });
  }, [user]);

  const dateRange = useMemo(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }, []);

  const { data: performanceScores, isLoading } = useEmployeePerformance(dateRange.start, dateRange.end);
  const { data: monthlyHistory = [] } = useMonthlyScores(employeeId, 6);
  const { configs: badgeConfigs } = useBadgeConfigurations();

  const effectiveScore = useMemo(() => {
    if (!performanceScores || !employeeId) return null;
    const mine = performanceScores.find(s => s.employee_id === employeeId);
    if (!mine) return null;
    return computeEffectiveScore(mine);
  }, [performanceScores, employeeId]);

  // Compute current location rank
  const locationRank = useMemo(() => {
    if (!performanceScores || !employeeId || !locationId) return null;
    const locationEmployees = performanceScores.filter(s => s.location_id === locationId);
    const ranked = locationEmployees
      .map(s => ({ id: s.employee_id, score: computeEffectiveScore(s).effective_score ?? -1 }))
      .sort((a, b) => b.score - a.score);
    const idx = ranked.findIndex(r => r.id === employeeId);
    return idx >= 0 ? idx + 1 : null;
  }, [performanceScores, employeeId, locationId]);

  // Compute badges
  const earnedBadges = useMemo(() => {
    const historyRecords: MonthlyScoreRecord[] = monthlyHistory.map(h => ({
      month: h.month,
      effective_score: h.effective_score !== null ? Number(h.effective_score) : null,
      rank_in_location: h.rank_in_location,
    }));
    return computeEarnedBadges(effectiveScore, historyRecords, locationRank, badgeConfigs.length > 0 ? badgeConfigs : undefined);
  }, [effectiveScore, monthlyHistory, locationRank, badgeConfigs]);

  const tip = effectiveScore ? getImprovementTip(effectiveScore) : null;

  if (isLoading || !employeeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const overallDisplay = effectiveScore ? formatEffectiveScore(effectiveScore.effective_score) : "—";
  const overallValue = effectiveScore?.effective_score ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground px-safe pt-safe pb-8">
        <div className="px-4 pt-4">
          <Button variant="ghost" size="sm" className="text-primary-foreground mb-3 -ml-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">My Score Breakdown</h1>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm opacity-90">
              {format(startOfMonth(new Date()), "MMMM yyyy")}
            </p>
            <TierBadge score={effectiveScore?.effective_score ?? null} size="sm" />
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-6">
        {/* Overall Score Card */}
        <Card className="p-6 shadow-lg text-center">
          <div className="text-sm text-muted-foreground mb-2">Overall Effective Score</div>
          <div className={`text-5xl font-bold mb-3 ${effectiveScore?.effective_score != null ? getScoreColor(overallValue) : "text-muted-foreground"}`}>
            {overallDisplay}
          </div>
          <Progress
            value={overallValue}
            className={`h-3 ${effectiveScore?.effective_score != null ? getProgressColor(overallValue) : ""}`}
          />
          {effectiveScore && (
            <div className="text-xs text-muted-foreground mt-2">
              Based on {effectiveScore.used_components_count} of 5 components with data
              {locationRank && ` • Rank #${locationRank} at your location`}
            </div>
          )}
        </Card>

        {/* Score History Chart */}
        <ScoreHistoryChart history={monthlyHistory} currentScore={effectiveScore?.effective_score ?? null} />

        {/* Badges */}
        <BadgesSection badges={earnedBadges} />

        {/* Component Breakdown */}
        <div>
          <h2 className="font-semibold mb-3 px-1">Score Components</h2>
          <div className="space-y-3">
            {COMPONENTS.map((comp) => {
              const isUsed = effectiveScore ? effectiveScore[comp.usedField] : false;
              const score = effectiveScore ? effectiveScore[comp.scoreField] : 0;
              const Icon = comp.icon;

              return (
                <Card key={comp.key} className={`p-4 ${!isUsed ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{comp.label}</span>
                    </div>
                    {isUsed ? (
                      <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                        {score.toFixed(1)}
                      </span>
                    ) : (
                      <Badge variant="outline" className="text-xs">No data</Badge>
                    )}
                  </div>
                  {isUsed && (
                    <>
                      <Progress value={score} className={`h-2 mb-1.5 ${getProgressColor(score)}`} />
                      <div className="text-xs text-muted-foreground">
                        {effectiveScore && comp.metricFn(effectiveScore)}
                      </div>
                    </>
                  )}
                  {!isUsed && (
                    <div className="text-xs text-muted-foreground">
                      No {comp.label.toLowerCase()} data recorded this month — excluded from average.
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Warning Penalty */}
        {effectiveScore && effectiveScore.warning_count > 0 && (
          <Card className="p-4 border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-medium">Warning Penalty</span>
            </div>
            <div className="text-2xl font-bold text-destructive mb-1">
              −{effectiveScore.warning_penalty.toFixed(1)} pts
            </div>
            <div className="text-xs text-muted-foreground">
              {effectiveScore.warning_count} warning{effectiveScore.warning_count > 1 ? "s" : ""} in the last 90 days.
              Penalties decay linearly over 90 days.
            </div>
          </Card>
        )}

        {/* Improvement Tip */}
        {tip && (
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-sm mb-1">How to improve</div>
                <div className="text-sm text-muted-foreground">{tip}</div>
              </div>
            </div>
          </Card>
        )}

        {/* Score Legend */}
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Score Scale</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>80–100 Great</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span>60–79 Fair</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span>0–59 Needs work</span>
            </div>
          </div>
        </Card>
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffScoreBreakdown;
