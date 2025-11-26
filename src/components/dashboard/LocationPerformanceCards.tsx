import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { usePerformanceTrends } from "@/hooks/usePerformanceTrends";
import { LocationPerformanceDetail } from "./LocationPerformanceDetail";
import { useState } from "react";
import type { LocationPerformance } from "@/hooks/usePerformanceTrends";

export const LocationPerformanceCards = () => {
  const { locationPerformance, isLoading } = usePerformanceTrends();
  const [selectedLocation, setSelectedLocation] = useState<LocationPerformance | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendBadge = (trend: 'improving' | 'declining' | 'stable') => {
    const variants = {
      improving: { text: 'Improving', className: 'bg-success text-success-foreground' },
      declining: { text: 'Declining', className: 'bg-destructive text-destructive-foreground' },
      stable: { text: 'Stable', className: 'bg-muted text-muted-foreground' },
    };
    const { text, className } = variants[trend];
    return <Badge className={className}>{text}</Badge>;
  };

  const handleLocationClick = (location: LocationPerformance) => {
    setSelectedLocation(location);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading location performance...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Location Performance</h3>
            <p className="text-sm text-muted-foreground mt-1">Click a location for detailed analytics</p>
          </div>

          {locationPerformance.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No location data available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locationPerformance.map((location) => (
                <Card
                  key={location.locationId}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleLocationClick(location)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{location.locationName}</h4>
                      {getTrendIcon(location.overallTrend)}
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{location.avgScore}%</span>
                      <span className="text-sm text-muted-foreground">avg score</span>
                    </div>

                    <div className="flex items-center justify-between">
                      {getTrendBadge(location.overallTrend)}
                      <span className="text-xs text-muted-foreground">
                        {location.audits.length} audits
                      </span>
                    </div>

                    {location.weakestAreas.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Weakest area:</p>
                        <p className="text-sm font-medium truncate">{location.weakestAreas[0].section}</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
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
