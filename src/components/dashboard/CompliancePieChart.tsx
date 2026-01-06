import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useLocationAudits } from "@/hooks/useAudits";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { startOfDay, endOfDay } from "date-fns";

const COMPLIANCE_THRESHOLD = 80;
const COLORS = {
  compliant: "hsl(var(--success))",
  nonCompliant: "hsl(var(--destructive))",
};

interface CompliancePieChartProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const CompliancePieChart = ({ dateFrom, dateTo }: CompliancePieChartProps) => {
  const { t } = useTranslation();
  const { data: audits, isLoading } = useLocationAudits();

  const { pieData, averageScore, filteredAuditsCount } = useMemo(() => {
    if (!audits || audits.length === 0) return { pieData: [], averageScore: 0, filteredAuditsCount: 0 };

    // Filter audits by date range if provided
    let filteredAudits = audits;
    if (dateFrom || dateTo) {
      filteredAudits = audits.filter(audit => {
        const auditDate = new Date(audit.audit_date);
        if (dateFrom && auditDate < startOfDay(dateFrom)) return false;
        if (dateTo && auditDate > endOfDay(dateTo)) return false;
        return true;
      });
    }

    if (filteredAudits.length === 0) return { pieData: [], averageScore: 0, filteredAuditsCount: 0 };

    const totalScore = filteredAudits.reduce((sum, audit) => sum + (audit.overall_score || 0), 0);
    const avgScore = Math.round(totalScore / filteredAudits.length);
    
    const compliant = filteredAudits.filter(a => (a.overall_score || 0) >= COMPLIANCE_THRESHOLD).length;
    const nonCompliant = filteredAudits.length - compliant;

    return {
      pieData: [
        { name: t('dashboard.compliance.compliant'), value: compliant },
        { name: t('dashboard.compliance.nonCompliant'), value: nonCompliant },
      ],
      averageScore: avgScore,
      filteredAuditsCount: filteredAudits.length
    };
  }, [audits, t, dateFrom, dateTo]);


  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('dashboard.compliance.title')}</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (!audits || audits.length === 0 || filteredAuditsCount === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('dashboard.compliance.title')}</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          {t('dashboard.compliance.noData')}
        </div>
      </Card>
    );
  }

  const compliantPercentage = Math.round((pieData[0].value / filteredAuditsCount) * 100);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{t('dashboard.compliance.title')}</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-4 bg-secondary/50 rounded-lg">
          <span className="text-3xl font-bold">{averageScore}%</span>
          <p className="text-sm text-muted-foreground mt-1">{t('dashboard.stats.averageScore')}</p>
        </div>
        <div className="text-center p-4 bg-secondary/50 rounded-lg">
          <span className="text-3xl font-bold">{compliantPercentage}%</span>
          <p className="text-sm text-muted-foreground mt-1">{t('dashboard.compliance.meetThreshold', { threshold: COMPLIANCE_THRESHOLD })}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
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
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.compliant : COLORS.nonCompliant} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
