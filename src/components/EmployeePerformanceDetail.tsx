import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { useTestSubmissions } from "@/hooks/useTestSubmissions";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ClipboardCheck, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { data: audits } = useStaffAudits(employeeId || undefined);
  const { data: testSubmissions } = useTestSubmissions(employeeId || undefined);

  if (!employeeId) return null;

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
    ? Math.round(audits.reduce((sum, a) => sum + a.score, 0) / audits.length)
    : 0;

  const testAverage = testSubmissions && testSubmissions.length > 0
    ? Math.round(testSubmissions.filter(t => t.score !== null).reduce((sum, t) => sum + (t.score || 0), 0) / testSubmissions.filter(t => t.score !== null).length)
    : 0;

  const overallAverage = allScores.length > 0
    ? Math.round(allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length)
    : 0;

  const getTrend = () => {
    if (allScores.length < 2) return "neutral";
    const recent = (allScores[0].score + allScores[1].score) / 2;
    const older = allScores.slice(-2).reduce((sum, s) => sum + s.score, 0) / Math.min(2, allScores.length - 1);
    if (recent > older + 5) return "up";
    if (recent < older - 5) return "down";
    return "neutral";
  };

  const trend = getTrend();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Performance Analysis</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="text-xl font-bold">{employeeName}</h3>
              <p className="text-muted-foreground">{employeeRole}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Overall Average</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant={overallAverage >= 80 ? "default" : overallAverage >= 60 ? "secondary" : "destructive"}
                  className="text-xl px-3 py-1"
                >
                  {overallAverage}%
                </Badge>
                {trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
                {trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                {trend === "neutral" && <Minus className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <p className="text-sm text-muted-foreground">Staff Audits Avg</p>
              </div>
              <p className="text-2xl font-bold">{auditAverage}%</p>
              <p className="text-xs text-muted-foreground mt-1">{audits?.length || 0} audits</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-sm text-muted-foreground">Test Scores Avg</p>
              </div>
              <p className="text-2xl font-bold">{testAverage}%</p>
              <p className="text-xs text-muted-foreground mt-1">{testSubmissions?.length || 0} tests</p>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Performance Trend (Last 10 Records)</h4>
            <ResponsiveContainer width="100%" height={300}>
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
          </div>

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
                    {item.score}%
                  </Badge>
                </div>
              ))}
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
                    {audit.score}%
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
                    {submission.score}%
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
