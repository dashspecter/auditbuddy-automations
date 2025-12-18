import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocationTrends } from "@/hooks/useLocationTrends";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { usePerformanceTrends } from "@/hooks/usePerformanceTrends";
import { LocationPerformanceDetail } from "./LocationPerformanceDetail";
import type { LocationPerformance } from "@/hooks/usePerformanceTrends";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";

export const LocationTrendAnalysis = () => {
  const { t } = useTranslation();
  const { locationTrends, isLoading } = useLocationTrends();
  const { locationPerformance } = usePerformanceTrends();
  const [selectedLocation, setSelectedLocation] = useState<LocationPerformance | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLocationClick = (locationName: string) => {
    const location = locationPerformance.find(
      loc => loc.locationName === locationName
    );
    if (location) {
      setSelectedLocation(location);
      setDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('dashboard.charts.locationPerformanceTrends')}</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (locationTrends.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('dashboard.charts.locationPerformanceTrends')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('dashboard.charts.noTrendData')}
        </p>
      </Card>
    );
  }

  const getTrendIcon = (trend: 'improvement' | 'decline' | 'stable') => {
    switch (trend) {
      case 'improvement':
        return <TrendingUp className="h-5 w-5 text-success" />;
      case 'decline':
        return <TrendingDown className="h-5 w-5 text-destructive" />;
      case 'stable':
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTrendBadge = (trend: 'improvement' | 'decline' | 'stable') => {
    const variants = {
      improvement: 'default',
      decline: 'destructive',
      stable: 'secondary'
    } as const;

    const labels = {
      improvement: t('dashboard.charts.improving'),
      decline: t('dashboard.charts.declining'),
      stable: t('dashboard.charts.stable')
    };

    return (
      <Badge variant={variants[trend]}>
        {labels[trend]}
      </Badge>
    );
  };

  const getScoreDifferenceColor = (difference: number) => {
    if (Math.abs(difference) < 2) return 'text-muted-foreground';
    return difference > 0 ? 'text-success' : 'text-destructive';
  };

  return (
    <>
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{t('dashboard.charts.locationPerformanceTrends')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.charts.compareScores')}
          </p>
        </div>
        
        <div className="space-y-4">
          {locationTrends.map((trend) => {
            const locationData = locationPerformance.find(
              loc => loc.locationName === trend.location
            );
            
            const chartData = locationData?.audits
              .sort((a, b) => new Date(a.audit_date).getTime() - new Date(b.audit_date).getTime())
              .map(audit => ({
                date: format(new Date(audit.audit_date), 'MMM dd'),
                score: audit.overall_score || 0
              })) || [];

            return (
              <div
                key={trend.location}
                onClick={() => handleLocationClick(trend.location)}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{trend.location}</h4>
                      {getTrendBadge(trend.trend)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {trend.auditCount} {t('dashboard.charts.totalAudits')} • {t('dashboard.charts.latest')}: {format(new Date(trend.currentAuditDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {getTrendIcon(trend.trend)}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('dashboard.charts.currentScore')}</p>
                    <p className="text-2xl font-bold">{trend.currentScore}%</p>
                  </div>
                  
                  {trend.auditCount > 1 ? (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t('dashboard.charts.previousScore')}</p>
                        <p className="text-2xl font-bold text-muted-foreground">{trend.previousScore}%</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t('dashboard.charts.change')}</p>
                        <p className={`text-2xl font-bold ${getScoreDifferenceColor(trend.scoreDifference)}`}>
                          {trend.scoreDifference > 0 ? '+' : ''}{trend.scoreDifference}%
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">{t('dashboard.charts.firstAuditNoComparison')}</p>
                    </div>
                  )}
                </div>

                {chartData.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          tickLine={false}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(value) => `${value}%`}
                          width={35}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ 
                            fill: 'hsl(var(--primary))', 
                            r: 4,
                            strokeWidth: 2,
                            stroke: 'hsl(var(--background))'
                          }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {trend.trend !== 'stable' && trend.auditCount > 1 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      {trend.trend === 'improvement' ? '📈' : '📉'} 
                      {' '}
                      {Math.abs(trend.percentageChange).toFixed(1)}% 
                      {trend.trend === 'improvement' ? ` ${t('dashboard.charts.improvement')}` : ` ${t('dashboard.charts.decline')}`} 
                      {' '}{t('dashboard.charts.since')} {format(new Date(trend.previousAuditDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <LocationPerformanceDetail
        location={selectedLocation}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};
