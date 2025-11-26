import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

  if (!employeeId || !audits) return null;

  const chartData = audits
    .slice(0, 10)
    .reverse()
    .map((audit) => ({
      date: format(new Date(audit.audit_date), "MMM d"),
      score: audit.score,
      fullDate: format(new Date(audit.audit_date), "PPP"),
    }));

  const averageScore = audits.length > 0
    ? Math.round(audits.reduce((sum, a) => sum + a.score, 0) / audits.length)
    : 0;

  const getTrend = () => {
    if (audits.length < 2) return "neutral";
    const recent = (audits[0].score + audits[1].score) / 2;
    const older = audits.slice(-2).reduce((sum, a) => sum + a.score, 0) / Math.min(2, audits.length - 1);
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
              <p className="text-sm text-muted-foreground">Average Score</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant={averageScore >= 80 ? "default" : averageScore >= 60 ? "secondary" : "destructive"}
                  className="text-xl px-3 py-1"
                >
                  {averageScore}%
                </Badge>
                {trend === "up" && <TrendingUp className="h-5 w-5 text-green-500" />}
                {trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                {trend === "neutral" && <Minus className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Score Trend (Last 10 Audits)</h4>
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
                  formatter={(value: number) => [`${value}%`, 'Score']}
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

          <div>
            <h4 className="text-lg font-semibold mb-3">Audit History</h4>
            <div className="space-y-2">
              {audits.slice(0, 10).map((audit) => (
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
