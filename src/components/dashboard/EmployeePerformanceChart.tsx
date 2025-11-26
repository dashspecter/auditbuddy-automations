import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { useEmployees } from "@/hooks/useEmployees";
import { useMemo } from "react";
import { format } from "date-fns";

export const EmployeePerformanceChart = () => {
  const { data: staffAudits, isLoading: auditsLoading } = useStaffAudits();
  const { data: employees, isLoading: employeesLoading } = useEmployees();

  const chartData = useMemo(() => {
    if (!staffAudits || !employees) return [];

    // Group audits by employee
    const employeeMap = new Map<string, { name: string; audits: Array<{ date: string; score: number }> }>();

    staffAudits.forEach(audit => {
      const employeeName = audit.employees?.full_name || 'Unknown Employee';
      const employeeId = audit.employee_id;

      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, { name: employeeName, audits: [] });
      }

      employeeMap.get(employeeId)!.audits.push({
        date: audit.audit_date,
        score: audit.score
      });
    });

    // Sort audits by date for each employee and calculate average scores
    const employeePerformance = Array.from(employeeMap.entries()).map(([id, data]) => {
      const sortedAudits = data.audits.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const avgScore = sortedAudits.length > 0
        ? Math.round(sortedAudits.reduce((sum, audit) => sum + audit.score, 0) / sortedAudits.length)
        : 0;

      return {
        name: data.name,
        score: avgScore,
        auditCount: sortedAudits.length,
        lastAuditDate: sortedAudits.length > 0 ? sortedAudits[sortedAudits.length - 1].date : null
      };
    });

    // Sort by average score (highest first) and limit to top 10 employees
    return employeePerformance
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [staffAudits, employees]);

  const isLoading = auditsLoading || employeesLoading;

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Employee Performance</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Employee Performance</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No employee performance data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-2">Top Employee Performance</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Average scores based on staff audits (Top 10)
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            domain={[0, 100]}
            fontSize={12}
            label={{ 
              value: 'Average Score (%)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: 'hsl(var(--muted-foreground))' }
            }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: number, name: string, props: any) => {
              const auditCount = props.payload.auditCount;
              const lastAudit = props.payload.lastAuditDate;
              return [
                <div key="tooltip" className="space-y-1">
                  <div>{`Average Score: ${value}%`}</div>
                  <div className="text-xs text-muted-foreground">{`Total Audits: ${auditCount}`}</div>
                  {lastAudit && (
                    <div className="text-xs text-muted-foreground">
                      {`Last Audit: ${format(new Date(lastAudit), 'MMM dd, yyyy')}`}
                    </div>
                  )}
                </div>,
                ''
              ];
            }}
            labelFormatter={(label) => label}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            content={() => (
              <div className="flex justify-center text-sm text-muted-foreground">
                <span>Employee Average Performance</span>
              </div>
            )}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            dot={{ 
              fill: 'hsl(var(--primary))', 
              r: 6,
              strokeWidth: 2,
              stroke: 'hsl(var(--background))'
            }}
            activeDot={{ r: 8 }}
            name="Average Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
