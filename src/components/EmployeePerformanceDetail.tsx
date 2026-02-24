import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { useTestSubmissions } from "@/hooks/useTestSubmissions";
import { format, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ClipboardCheck, 
  FileText, 
  Calendar, 
  Clock, 
  CheckSquare,
  AlertTriangle,
  Star
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmployeePerformance } from "@/hooks/useEmployeePerformance";
import { computeEffectiveScore } from "@/lib/effectiveScore";
import { Card } from "@/components/ui/card";

interface EmployeePerformanceDetailProps {
  employeeId: string | null;
  employeeName: string;
  employeeRole: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EmployeePerformanceDetail = ({
  employeeId,
  employeeName,
  employeeRole,
  open,
  onOpenChange,
}: EmployeePerformanceDetailProps) => {
  // Default to last 3 months for performance data
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
  
  const { data: performanceData } = useEmployeePerformance(startDate, endDate);
  const { data: audits } = useStaffAudits(employeeId || undefined);
  const { data: testSubmissions } = useTestSubmissions(employeeId || undefined);

  if (!employeeId) return null;

  // Find the employee's performance data
  const employeePerformance = performanceData?.find(p => p.employee_id === employeeId);

  // Combine both audits and test scores for the chart
  const allScores = [
    ...(audits || []).map(a => ({ date: new Date(a.audit_date), score: a.score, type: 'audit' as const })),
    ...(testSubmissions || []).filter(t => t.completed_at && t.score !== null).map(t => ({ 
      date: new Date(t.completed_at!), 
      score: t.score!, 
      type: 'test' as const 
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const chartData = allScores
    .slice(0, 10)
    .reverse()
    .map((item) => ({
      date: format(item.date, "MMM d"),
      score: item.score,
      fullDate: format(item.date, "PPP"),
      type: item.type,
    }));

  const auditAverage = audits && audits.length > 0
    ? audits.reduce((sum, a) => sum + a.score, 0) / audits.length
    : 0;

  const testAverage = testSubmissions && testSubmissions.length > 0
    ? testSubmissions.filter(t => t.score !== null).reduce((sum, t) => sum + (t.score || 0), 0) / testSubmissions.filter(t => t.score !== null).length
    : 0;

  // Calculate effective score using shared utility for consistency
  const effectiveData = employeePerformance ? computeEffectiveScore(employeePerformance) : null;
  const effectiveScore = effectiveData?.effective_score ?? (
    allScores.length > 0
      ? allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length
      : null
  );

  const getTrend = () => {
    if (allScores.length < 2) return "neutral";
    const recent = (allScores[0].score + allScores[1].score) / 2;
    const older = allScores.slice(-2).reduce((sum, s) => sum + s.score, 0) / Math.min(2, allScores.length - 1);
    if (recent > older + 5) return "up";
    if (recent < older - 5) return "down";
    return "neutral";
  };

  const trend = getTrend();

  // Helper to check if metric has data
  const hasData = (metricValue: number | undefined, threshold: number = 0) => {
    return metricValue !== undefined && metricValue > threshold;
  };

  // Format score or show "—" if no data
  const formatScore = (score: number | undefined, hasActivity: boolean) => {
    if (!hasActivity) return "—";
    return `${(score ?? 0).toFixed(0)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Performance Analysis</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with employee info and overall score */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{employeeName}</h3>
                {employeePerformance && (employeePerformance.warning_count || 0) > 0 && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {employeePerformance.warning_count} warning{employeePerformance.warning_count !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{employeeRole}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Overall Average</p>
              <div className="flex items-center gap-2">
                {effectiveScore !== null ? (
                  <Badge
                    variant={effectiveScore >= 80 ? "default" : effectiveScore >= 60 ? "secondary" : "destructive"}
                    className="text-xl px-3 py-1"
                  >
                    {effectiveScore.toFixed(1)}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xl px-3 py-1">—</Badge>
                )}
                {trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
                {trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                {trend === "neutral" && <Minus className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>
          </div>

          {/* All 6 metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Attendance */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
              <p className="text-xl font-bold">
                {formatScore(employeePerformance?.attendance_score, hasData(employeePerformance?.shifts_scheduled))}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {hasData(employeePerformance?.shifts_scheduled)
                  ? `${employeePerformance?.shifts_worked}/${employeePerformance?.shifts_scheduled} shifts`
                  : "No scheduled shifts"}
              </p>
            </Card>

            {/* Punctuality */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Punctuality</p>
              </div>
              <p className="text-xl font-bold">
                {formatScore(employeePerformance?.punctuality_score, hasData(employeePerformance?.shifts_scheduled))}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {hasData(employeePerformance?.shifts_scheduled)
                  ? (employeePerformance?.late_count || 0) > 0
                    ? `${employeePerformance?.late_count} late (${employeePerformance?.total_late_minutes} min)`
                    : "No late arrivals"
                  : "No shift data"}
              </p>
            </Card>

            {/* Tasks */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
              <p className="text-xl font-bold">
                {formatScore(employeePerformance?.task_score, hasData(employeePerformance?.tasks_assigned))}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {hasData(employeePerformance?.tasks_assigned)
                  ? `${employeePerformance?.tasks_completed_on_time}/${employeePerformance?.tasks_assigned} on time`
                  : "No assigned tasks"}
              </p>
            </Card>

            {/* Tests */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Tests</p>
              </div>
              <p className="text-xl font-bold">
                {formatScore(employeePerformance?.test_score, hasData(employeePerformance?.tests_taken))}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {hasData(employeePerformance?.tests_taken)
                  ? `${employeePerformance?.tests_passed}/${employeePerformance?.tests_taken} passed`
                  : "No tests taken"}
              </p>
            </Card>

            {/* Staff Audits / Reviews */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Staff Audits</p>
              </div>
              <p className="text-xl font-bold">
                {formatScore(employeePerformance?.performance_review_score, hasData(employeePerformance?.reviews_count))}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {hasData(employeePerformance?.reviews_count)
                  ? `${employeePerformance?.reviews_count} review${employeePerformance?.reviews_count !== 1 ? 's' : ''}`
                  : "No reviews"}
              </p>
            </Card>

            {/* Warnings */}
            <Card className={`p-3 ${(employeePerformance?.warning_count || 0) > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`h-4 w-4 ${(employeePerformance?.warning_count || 0) > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
              <p className={`text-xl font-bold ${(employeePerformance?.warning_count || 0) > 0 ? 'text-orange-600' : ''}`}>
                {employeePerformance?.warning_count || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {(employeePerformance?.warning_penalty || 0) > 0
                  ? `-${employeePerformance?.warning_penalty.toFixed(0)} pts penalty`
                  : "No active warnings"}
              </p>
            </Card>
          </div>

          {/* Performance Trend Chart */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Performance Trend (Last 10 Records)</h4>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value}% (${props.payload.type === 'audit' ? 'Staff Audit' : 'Test'})`, 
                      'Score'
                    ]}
                    labelFormatter={(label) => {
                      const item = chartData.find(d => d.date === label);
                      return item?.fullDate || label;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground border rounded-lg">
                No performance data available
              </div>
            )}
          </div>

          {/* Tabs for detailed records */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Records</TabsTrigger>
              <TabsTrigger value="audits">Staff Audits</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-2 mt-4">
              {allScores.slice(0, 10).map((item, index) => (
                <div
                  key={`${item.type}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'audit' ? (
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{format(item.date, "PPP")}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type === 'audit' ? 'Staff Audit' : 'Test'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={item.score >= 80 ? "default" : item.score >= 60 ? "secondary" : "destructive"}
                    className="text-lg px-3 py-1"
                  >
                    {item.score.toFixed(1)}%
                  </Badge>
                </div>
              ))}
              {allScores.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No records yet</p>
              )}
            </TabsContent>

            <TabsContent value="audits" className="space-y-2 mt-4">
              {(audits || []).slice(0, 10).map((audit) => (
                <div
                  key={audit.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div>
                    <p className="font-medium">{format(new Date(audit.audit_date), "PPP")}</p>
                    {audit.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{audit.notes}</p>
                    )}
                  </div>
                  <Badge
                    variant={audit.score >= 80 ? "default" : audit.score >= 60 ? "secondary" : "destructive"}
                    className="text-lg px-3 py-1"
                  >
                    {audit.score.toFixed(1)}%
                  </Badge>
                </div>
              ))}
              {(!audits || audits.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No staff audits yet</p>
              )}
            </TabsContent>

            <TabsContent value="tests" className="space-y-2 mt-4">
              {(testSubmissions || []).filter(t => t.completed_at && t.score !== null).map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div>
                    <p className="font-medium">{format(new Date(submission.completed_at!), "PPP")}</p>
                    {submission.tests?.title && (
                      <p className="text-sm text-muted-foreground mt-1">{submission.tests.title}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      {submission.passed && (
                        <Badge variant="outline" className="text-xs">Passed</Badge>
                      )}
                      {submission.time_taken_minutes && (
                        <Badge variant="outline" className="text-xs">
                          {submission.time_taken_minutes} min
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={submission.score! >= 80 ? "default" : submission.score! >= 60 ? "secondary" : "destructive"}
                    className="text-lg px-3 py-1"
                  >
                    {submission.score!.toFixed(1)}%
                  </Badge>
                </div>
              ))}
              {(!testSubmissions || testSubmissions.filter(t => t.completed_at && t.score !== null).length === 0) && (
                <p className="text-center text-muted-foreground py-8">No test submissions yet</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
