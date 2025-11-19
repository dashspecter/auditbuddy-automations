import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useLocationAudits } from "@/hooks/useAudits";
import { useMemo } from "react";

const COMPLIANCE_THRESHOLD = 80;
const COLORS = {
  compliant: "hsl(var(--success))",
  nonCompliant: "hsl(var(--destructive))",
};

export const CompliancePieChart = () => {
  const { data: audits, isLoading } = useLocationAudits();

  const pieData = useMemo(() => {
    if (!audits || audits.length === 0) return [];

    const compliant = audits.filter(a => (a.overall_score || 0) >= COMPLIANCE_THRESHOLD).length;
    const nonCompliant = audits.length - compliant;

    return [
      { name: 'Compliant', value: compliant },
      { name: 'Non-Compliant', value: nonCompliant },
    ];
  }, [audits]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Compliance</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (!audits || audits.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Compliance</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No audit data available
        </div>
      </Card>
    );
  }

  const compliantPercentage = Math.round((pieData[0].value / audits.length) * 100);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Overall Compliance</h3>
      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-primary">{compliantPercentage}%</div>
        <p className="text-sm text-muted-foreground">
          {pieData[0].value} of {audits.length} audits compliant
        </p>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            <Cell key="compliant" fill={COLORS.compliant} />
            <Cell key="nonCompliant" fill={COLORS.nonCompliant} />
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
