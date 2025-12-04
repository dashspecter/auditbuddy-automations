import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { usePerformanceLeaderboard } from "@/hooks/useEmployeePerformance";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { UserAvatar } from "@/components/UserAvatar";

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

  const { byLocation, isLoading } = usePerformanceLeaderboard(startDate, endDate, locationId, 10);

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

  const locationData = byLocation.find((l) => l.location_id === locationId);
  const employees = locationData?.employees.slice(0, 5) || [];

  if (employees.length === 0) {
    return null;
  }

  // Find current employee's rank
  const currentEmployeeRank = locationData?.employees.findIndex(
    (e) => e.employee_id === currentEmployeeId
  );
  const currentEmployee = locationData?.employees.find(
    (e) => e.employee_id === currentEmployeeId
  );

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Location Leaderboard</h3>
        <Badge variant="outline" className="text-xs ml-auto">
          This Month
        </Badge>
      </div>

      <div className="space-y-2">
        {employees.map((employee, index) => {
          const isCurrentUser = employee.employee_id === currentEmployeeId;
          return (
            <div
              key={employee.employee_id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
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
                <span className="text-xs text-muted-foreground">{employee.role}</span>
              </div>
              <div className={`font-bold text-lg ${getScoreColor(employee.overall_score)}`}>
                {employee.overall_score}
              </div>
            </div>
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
              <span className="text-xs text-muted-foreground block">{currentEmployee.role}</span>
            </div>
            <div className={`font-bold text-lg ${getScoreColor(currentEmployee.overall_score)}`}>
              {currentEmployee.overall_score}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
