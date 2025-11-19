import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useLocationAudits } from "@/hooks/useAudits";
import { useMemo } from "react";
import { subWeeks, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

const COMPLIANCE_THRESHOLD = 80;

export const ComplianceChart = () => {
  const { data: audits, isLoading } = useLocationAudits();

  const weeklyData = useMemo(() => {
    if (!audits) return [];

    const now = new Date();
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(now, 3 - i));
      const weekEnd = endOfWeek(subWeeks(now, 3 - i));
      return {
        name: `Week ${i + 1}`,
        start: weekStart,
        end: weekEnd,
        compliant: 0,
        nonCompliant: 0,
      };
    });

    audits.forEach(audit => {
      const auditDate = new Date(audit.audit_date || audit.created_at);
      const score = audit.overall_score || 0;
      const isCompliant = score >= COMPLIANCE_THRESHOLD;

      weeks.forEach(week => {
        if (isWithinInterval(auditDate, { start: week.start, end: week.end })) {
          if (isCompliant) {
            week.compliant++;
          } else {
            week.nonCompliant++;
          }
        }
      });
    });

    return weeks.map(week => ({
      name: week.name,
      compliant: week.compliant,
      nonCompliant: week.nonCompliant,
    }));
  }, [audits]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Compliance Trends</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Compliance Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="compliant" fill="hsl(var(--success))" name="Compliant" />
          <Bar dataKey="nonCompliant" fill="hsl(var(--destructive))" name="Non-Compliant" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
