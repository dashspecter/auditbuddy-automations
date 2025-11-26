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

export const LocationTrendAnalysis = () => {
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
        <h3 className="text-lg font-semibold mb-4">Location Performance Trends</h3>
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
        <h3 className="text-lg font-semibold mb-4">Location Performance Trends</h3>
        <p className="text-sm text-muted-foreground">
          No trend data available. Each location needs at least 2 audits to show trends.
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
      improvement: 'Improving',
      decline: 'Declining',
      stable: 'Stable'
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
          <h3 className="text-lg font-semibold">Location Performance Trends</h3>
          <p className="text-sm text-muted-foreground">
            Compare current scores to previous audits for each location
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
                      {trend.auditCount} total audits • Latest: {format(new Date(trend.currentAuditDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {getTrendIcon(trend.trend)}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Score</p>
                    <p className="text-2xl font-bold">{trend.currentScore}%</p>
                  </div>
                  
                  {trend.auditCount > 1 ? (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Previous Score</p>
                        <p className="text-2xl font-bold text-muted-foreground">{trend.previousScore}%</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Change</p>
                        <p className={`text-2xl font-bold ${getScoreDifferenceColor(trend.scoreDifference)}`}>
                          {trend.scoreDifference > 0 ? '+' : ''}{trend.scoreDifference}%
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">First audit - no comparison available</p>
                    </div>
                  )}
                </div>

                {chartData.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <ResponsiveContainer width="100%" height={80}>
                      <LineChart data={chartData}>
                        <XAxis 
                          dataKey="date" 
                          hide 
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          hide 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={false}
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
                      {trend.trend === 'improvement' ? ' improvement' : ' decline'} 
                      {' '}since {format(new Date(trend.previousAuditDate), 'MMM d, yyyy')}
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
