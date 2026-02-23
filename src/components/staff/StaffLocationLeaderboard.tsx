import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, Info } from "lucide-react";
import { usePerformanceLeaderboard } from "@/hooks/useEmployeePerformance";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { UserAvatar } from "@/components/UserAvatar";
import { computeKioskLeaderboardScores, type KioskEmployeeScore } from "@/lib/kioskEffectiveScore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TierBadge } from "@/components/staff/TierBadge";

interface StaffLocationLeaderboardProps {
  locationId: string;
  currentEmployeeId?: string;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-primary";
  if (score >= 60) return "text-yellow-600";
  return "text-red-500";
};

export const StaffLocationLeaderboard = ({ locationId, currentEmployeeId }: StaffLocationLeaderboardProps) => {
  const now = new Date();
  const startDate = format(startOfMonth(now), "yyyy-MM-dd");
  const endDate = format(endOfMonth(now), "yyyy-MM-dd");

  const { byLocation, allScores, isLoading } = usePerformanceLeaderboard(startDate, endDate, locationId, 10);

  // Compute kiosk effective scores - only average components with real data
  const kioskScores = useMemo(() => {
    const locationData = byLocation.find((l) => l.location_id === locationId);
    if (!locationData) return [];
    
    return computeKioskLeaderboardScores(locationData.employees)
      .sort((a, b) => {
        // Sort by effective score (null scores go to bottom)
        const scoreA = a.kiosk_effective_overall_score ?? -1;
        const scoreB = b.kiosk_effective_overall_score ?? -1;
        return scoreB - scoreA;
      });
  }, [byLocation, locationId]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  const employees = kioskScores.slice(0, 5);

  if (employees.length === 0) {
    return null;
  }

  // Find current employee's rank
  const currentEmployeeRank = kioskScores.findIndex(
    (e) => e.employee_id === currentEmployeeId
  );
  const currentEmployee = kioskScores.find(
    (e) => e.employee_id === currentEmployeeId
  );

  // Helper to get component breakdown text
  const getComponentsText = (emp: KioskEmployeeScore) => {
    const components: string[] = [];
    if (emp.attendance_used) components.push(`Attendance: ${Math.round(emp.attendance_score)}`);
    if (emp.punctuality_used) components.push(`Punctuality: ${Math.round(emp.punctuality_score)}`);
    if (emp.task_used) components.push(`Tasks: ${Math.round(emp.task_score)}`);
    if (emp.test_used) components.push(`Tests: ${Math.round(emp.test_score)}`);
    if (emp.review_used) components.push(`Reviews: ${Math.round(emp.performance_review_score)}`);
    return components.length > 0 ? components.join(" • ") : "No activity data";
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Location Leaderboard</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Scores are calculated from components with actual activity only. 
                Empty categories don't count toward the average.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Badge variant="outline" className="text-xs ml-auto">
          This Month
        </Badge>
      </div>

      <div className="space-y-2">
        {employees.map((employee, index) => {
          const isCurrentUser = employee.employee_id === currentEmployeeId;
          const effectiveScore = employee.kiosk_effective_overall_score;
          
          return (
            <TooltipProvider key={employee.employee_id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-help ${
                      isCurrentUser
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="w-6 flex justify-center">
                      {getRankIcon(index + 1)}
                    </div>
                    <UserAvatar
                      avatarUrl={employee.avatar_url}
                      userName={employee.employee_name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm truncate ${isCurrentUser ? "text-primary" : ""}`}>
                          {employee.employee_name}
                          {isCurrentUser && " (You)"}
                        </span>
                      </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{employee.role}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <TierBadge score={effectiveScore} size="sm" showLabel={false} />
                      </div>
                    </div>
                    <div className={`font-bold text-lg ${effectiveScore !== null ? getScoreColor(effectiveScore) : "text-muted-foreground"}`}>
                      {effectiveScore !== null ? Math.round(effectiveScore) : "—"}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-sm font-medium mb-1">Score Breakdown</p>
                  <p className="text-xs text-muted-foreground">{getComponentsText(employee)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {currentEmployee && currentEmployeeRank !== undefined && currentEmployeeRank >= 5 && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
            <div className="w-6 flex justify-center">
              <span className="text-sm font-medium text-muted-foreground">
                {currentEmployeeRank + 1}
              </span>
            </div>
            <UserAvatar
              avatarUrl={currentEmployee.avatar_url}
              userName={currentEmployee.employee_name}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm text-primary">You</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{currentEmployee.role}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <TierBadge score={currentEmployee.kiosk_effective_overall_score} size="sm" showLabel={false} />
              </div>
            </div>
            <div className={`font-bold text-lg ${currentEmployee.kiosk_effective_overall_score !== null ? getScoreColor(currentEmployee.kiosk_effective_overall_score) : "text-muted-foreground"}`}>
              {currentEmployee.kiosk_effective_overall_score !== null ? Math.round(currentEmployee.kiosk_effective_overall_score) : "—"}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
