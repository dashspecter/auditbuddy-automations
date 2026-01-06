import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLocationAudits } from "@/hooks/useAudits";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { startOfDay, endOfDay } from "date-fns";

interface LocationPerformanceChartProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const LocationPerformanceChart = ({ dateFrom, dateTo }: LocationPerformanceChartProps) => {
  const { t } = useTranslation();
  const { data: audits, isLoading } = useLocationAudits();

  const locationData = useMemo(() => {
    if (!audits) return [];

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

    const locationMap = new Map<string, { total: number; count: number }>();

    filteredAudits.forEach(audit => {
      const locationName = audit.locations?.name || audit.location || 'Unknown';
      if (!locationMap.has(locationName)) {
        locationMap.set(locationName, { total: 0, count: 0 });
      }
      const loc = locationMap.get(locationName)!;
      loc.total += audit.overall_score || 0;
      loc.count += 1;
    });

    return Array.from(locationMap.entries())
      .map(([name, data]) => ({
        name,
        score: data.count > 0 ? Math.round(data.total / data.count) : 0
      }))
      .sort((a, b) => a.score - b.score);
  }, [audits, dateFrom, dateTo]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('dashboard.charts.locationPerformanceTrend')}</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{t('dashboard.charts.locationPerformanceTrend')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={locationData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            angle={locationData.length > 3 ? -45 : 0}
            textAnchor={locationData.length > 3 ? "end" : "middle"}
            height={locationData.length > 3 ? 80 : 30}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            domain={[0, 100]}
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: number) => [`${value}%`, t('dashboard.charts.averageScore')]}
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
            name={t('dashboard.charts.averageScore')}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
