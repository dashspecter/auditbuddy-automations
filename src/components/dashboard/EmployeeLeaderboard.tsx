import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { useEmployees } from "@/hooks/useEmployees";
import { useMemo } from "react";
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from "lucide-react";

export const EmployeeLeaderboard = () => {
  const { data: staffAudits, isLoading: auditsLoading } = useStaffAudits();
  const { data: employees, isLoading: employeesLoading } = useEmployees();

  const leaderboardData = useMemo(() => {
    if (!staffAudits || !employees) return [];

    // Group audits by employee
    const employeeMap = new Map<string, {
      name: string;
      location: string;
      role: string;
      audits: Array<{ score: number; date: string }>;
    }>();

    staffAudits.forEach(audit => {
      const employeeId = audit.employee_id;
      const employeeName = audit.employees?.full_name || 'Unknown Employee';
      const locationName = audit.locations?.name || 'Unknown Location';
      const employeeRole = audit.employees?.role || 'Unknown Role';

      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          name: employeeName,
          location: locationName,
          role: employeeRole,
          audits: []
        });
      }

      employeeMap.get(employeeId)!.audits.push({
        score: audit.score,
        date: audit.audit_date
      });
    });

    // Calculate statistics for each employee
    const employeeStats = Array.from(employeeMap.entries()).map(([id, data]) => {
      const scores = data.audits.map(a => a.score);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;

      // Calculate trend
      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (scores.length >= 2) {
        const sortedAudits = [...data.audits].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const recentScores = sortedAudits.slice(-2).map(a => a.score);
        const olderScores = sortedAudits.slice(0, 2).map(a => a.score);
        
        const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
        
        if (recentAvg > olderAvg + 5) trend = 'up';
        else if (recentAvg < olderAvg - 5) trend = 'down';
      }

      return {
        id,
        name: data.name,
        location: data.location,
        role: data.role,
        avgScore,
        auditCount: data.audits.length,
        trend
      };
    });

    // Sort by average score (highest first)
    return employeeStats
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 15); // Show top 15 employees
  }, [staffAudits, employees]);

  const isLoading = auditsLoading || employeesLoading;

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
            1st Place
          </Badge>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center gap-2">
          <Medal className="h-5 w-5 text-gray-400" />
          <Badge className="bg-gray-400 hover:bg-gray-500 text-white">
            2nd Place
          </Badge>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600" />
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white">
            3rd Place
          </Badge>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-semibold">
        {rank}
      </div>
    );
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-success" />;
    }
    if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-primary';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Employee Leaderboard</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (!leaderboardData || leaderboardData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Employee Leaderboard</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No employee data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Employee Leaderboard</h3>
          <p className="text-sm text-muted-foreground">
            Top performers based on staff audit scores
          </p>
        </div>
        <Trophy className="h-8 w-8 text-primary" />
      </div>

      <div className="space-y-3">
        {leaderboardData.map((employee, index) => {
          const rank = index + 1;
          const isTopThree = rank <= 3;

          return (
            <div
              key={employee.id}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                isTopThree
                  ? 'bg-primary/5 border-primary/20 shadow-sm'
                  : 'bg-card border-border hover:bg-secondary/50'
              }`}
            >
              {/* Rank Badge */}
              <div className="flex-shrink-0">
                {getRankBadge(rank)}
              </div>

              {/* Employee Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground truncate">
                    {employee.name}
                  </h4>
                  {getTrendIcon(employee.trend)}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="truncate">{employee.location}</span>
                  <span>•</span>
                  <span className="truncate">{employee.role}</span>
                  <span>•</span>
                  <span>{employee.auditCount} audit{employee.auditCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Score */}
              <div className="flex-shrink-0 text-right">
                <div className={`text-2xl font-bold ${getScoreColor(employee.avgScore)}`}>
                  {employee.avgScore}%
                </div>
                <div className="text-xs text-muted-foreground">
                  avg score
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
