import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Users, MapPin, TrendingUp, TrendingDown, CheckCircle, Clock, Calendar, DollarSign, Target, Trophy } from "lucide-react";
import { usePerformanceLeaderboard } from "@/hooks/useEmployeePerformance";
import { usePayrollSummary } from "@/hooks/usePayroll";
import { useLocations } from "@/hooks/useLocations";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
};

interface CompanyPerformanceOverviewProps {
  period?: "week" | "month" | "quarter";
}

export const CompanyPerformanceOverview = ({ period = "month" }: CompanyPerformanceOverviewProps) => {
  const now = new Date();
  const startDate = format(startOfMonth(now), "yyyy-MM-dd");
  const endDate = format(endOfMonth(now), "yyyy-MM-dd");

  const { data: locations = [] } = useLocations();
  const { totalAudits, avgScore, isLoading: statsLoading } = useDashboardStats();
  
  const { byLocation, allScores, isLoading: performanceLoading } = usePerformanceLeaderboard(
    startDate,
    endDate,
    undefined,
    100
  );

  const { data: payrollSummary = [], locationSummary = [] } = usePayrollSummary(
    startDate,
    endDate
  );

  // Calculate company-wide metrics
  const avgPerformanceScore = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s.overall_score, 0) / allScores.length)
    : 0;

  const totalEmployees = allScores.length;
  const excellentPerformers = allScores.filter(s => s.overall_score >= 90).length;
  const goodPerformers = allScores.filter(s => s.overall_score >= 70 && s.overall_score < 90).length;
  const averagePerformers = allScores.filter(s => s.overall_score >= 50 && s.overall_score < 70).length;
  const belowAveragePerformers = allScores.filter(s => s.overall_score < 50).length;

  // Performance distribution for pie chart
  const performanceDistribution = [
    { name: 'Excellent (90+)', value: excellentPerformers, color: '#22c55e' },
    { name: 'Good (70-89)', value: goodPerformers, color: '#3b82f6' },
    { name: 'Average (50-69)', value: averagePerformers, color: '#f59e0b' },
    { name: 'Needs Improvement (<50)', value: belowAveragePerformers, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Location performance comparison
  const locationPerformance = byLocation.map(loc => ({
    name: loc.location_name.length > 15 ? loc.location_name.substring(0, 15) + '...' : loc.location_name,
    fullName: loc.location_name,
    score: Math.round(loc.employees.reduce((sum, e) => sum + e.overall_score, 0) / loc.employees.length),
    employees: loc.employees.length,
  })).sort((a, b) => b.score - a.score);

  // Calculate attendance and task rates
  const totalShiftsScheduled = allScores.reduce((sum, s) => sum + s.shifts_scheduled, 0);
  const totalShiftsWorked = allScores.reduce((sum, s) => sum + s.shifts_worked, 0);
  const attendanceRate = totalShiftsScheduled > 0 ? Math.round((totalShiftsWorked / totalShiftsScheduled) * 100) : 100;

  const totalTasksAssigned = allScores.reduce((sum, s) => sum + s.tasks_assigned, 0);
  const totalTasksCompleted = allScores.reduce((sum, s) => sum + s.tasks_completed, 0);
  const taskCompletionRate = totalTasksAssigned > 0 ? Math.round((totalTasksCompleted / totalTasksAssigned) * 100) : 100;

  const totalLateArrivals = allScores.reduce((sum, s) => sum + s.late_count, 0);
  const punctualityRate = totalShiftsWorked > 0 ? Math.round(((totalShiftsWorked - totalLateArrivals) / totalShiftsWorked) * 100) : 100;

  if (statsLoading || performanceLoading) {
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
      {/* Company Overview Header */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {excellentPerformers} excellent performers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Avg Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(avgPerformanceScore)}`}>
              {avgPerformanceScore}%
            </div>
            <Progress value={avgPerformanceScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Audit Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}%</div>
            <p className="text-xs text-muted-foreground">
              {totalAudits} audits completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Key Rates */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-bold ${getScoreColor(attendanceRate)}`}>{attendanceRate}%</span>
              <span className="text-sm text-muted-foreground">
                {totalShiftsWorked}/{totalShiftsScheduled} shifts
              </span>
            </div>
            <Progress value={attendanceRate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Punctuality Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-bold ${getScoreColor(punctualityRate)}`}>{punctualityRate}%</span>
              <span className="text-sm text-muted-foreground">
                {totalLateArrivals} late arrivals
              </span>
            </div>
            <Progress value={punctualityRate} className="h-2" />
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
              <span className={`text-2xl font-bold ${getScoreColor(taskCompletionRate)}`}>{taskCompletionRate}%</span>
              <span className="text-sm text-muted-foreground">
                {totalTasksCompleted}/{totalTasksAssigned} tasks
              </span>
            </div>
            <Progress value={taskCompletionRate} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Performance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Distribution</CardTitle>
            <CardDescription>Employee performance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {performanceDistribution.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {performanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Location Performance</CardTitle>
            <CardDescription>Average performance score by location</CardDescription>
          </CardHeader>
          <CardContent>
            {locationPerformance.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Score']}
                      labelFormatter={(label) => locationPerformance.find(l => l.name === label)?.fullName || label}
                    />
                    <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No location data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Location Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Performance Details
          </CardTitle>
          <CardDescription>
            Detailed breakdown by location
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byLocation.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No location data available
            </div>
          ) : (
            <div className="space-y-4">
              {byLocation.map((location) => {
                const locAvgScore = Math.round(
                  location.employees.reduce((sum, e) => sum + e.overall_score, 0) / location.employees.length
                );
                const locAvgAttendance = Math.round(
                  location.employees.reduce((sum, e) => sum + e.attendance_score, 0) / location.employees.length
                );
                const locAvgPunctuality = Math.round(
                  location.employees.reduce((sum, e) => sum + e.punctuality_score, 0) / location.employees.length
                );
                const locAvgTasks = Math.round(
                  location.employees.reduce((sum, e) => sum + e.task_score, 0) / location.employees.length
                );
                const topPerformer = location.employees.sort((a, b) => b.overall_score - a.overall_score)[0];

                return (
                  <div key={location.location_id} className="border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {location.location_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {location.employees.length} employees
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Attendance</div>
                          <div className={`font-medium ${getScoreColor(locAvgAttendance)}`}>{locAvgAttendance}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Punctuality</div>
                          <div className={`font-medium ${getScoreColor(locAvgPunctuality)}`}>{locAvgPunctuality}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Tasks</div>
                          <div className={`font-medium ${getScoreColor(locAvgTasks)}`}>{locAvgTasks}%</div>
                        </div>
                        <div className="text-center border-l pl-4">
                          <div className="text-xs text-muted-foreground">Overall</div>
                          <div className={`text-xl font-bold ${getScoreColor(locAvgScore)}`}>{locAvgScore}%</div>
                        </div>
                      </div>
                    </div>
                    
                    {topPerformer && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-muted-foreground">Top performer:</span>
                        <span className="font-medium">{topPerformer.employee_name}</span>
                        <Badge variant="outline" className="text-xs">{topPerformer.overall_score}%</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
