import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePerformanceTrends } from "@/hooks/usePerformanceTrends";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { DashboardPreviewDialog } from "./DashboardPreviewDialog";
import { LocationDetailPopup } from "./popups/LocationDetailPopup";

interface DecliningLocationsCardProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const DecliningLocationsCard = ({ dateFrom, dateTo }: DecliningLocationsCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locationPerformance, isLoading } = usePerformanceTrends(undefined, dateFrom, dateTo);
  const [selectedLocation, setSelectedLocation] = useState<typeof locationPerformance[0] | null>(null);

  const declining = locationPerformance
    .filter(loc => loc.overallTrend === "declining")
    .slice(0, 3);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            {t("dashboard.declining.title", "Declining Locations")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            {t("dashboard.declining.title", "Declining Locations")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {declining.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              ✅ {t("dashboard.declining.noDecline", "No locations with declining trends")}
            </div>
          ) : (
            <div className="space-y-3">
              {declining.map((loc) => {
                const firstScore = loc.audits.length > 1 ? loc.audits[0]?.overall_score || 0 : loc.avgScore;
                const lastScore = loc.audits.length > 0 ? loc.audits[loc.audits.length - 1]?.overall_score || loc.avgScore : loc.avgScore;
                const change = lastScore - firstScore;

                return (
                  <div
                    key={loc.locationId}
                    className="flex items-center gap-3 p-2 rounded-md border border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                    onClick={() => setSelectedLocation(loc)}
                  >
                    <MapPin className="h-4 w-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{loc.locationName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={loc.avgScore} className="flex-1 h-1.5" />
                        <span className="text-xs font-bold text-destructive">{loc.avgScore}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-destructive">{change > 0 ? '+' : ''}{change}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Button
            variant="link"
            className="w-full mt-2 text-xs"
            onClick={() => navigate("/audits")}
          >
            {t("dashboard.declining.viewAll", "View All Location Trends")} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {selectedLocation && (
        <DashboardPreviewDialog
          open={!!selectedLocation}
          onOpenChange={(open) => !open && setSelectedLocation(null)}
          title={selectedLocation.locationName}
          description={t("dashboard.popup.locationTrend", "Location performance trend")}
          navigateTo="/audits"
          navigateLabel={t("dashboard.popup.goToAudits", "Go to Audits")}
        >
          <LocationDetailPopup
            locationName={selectedLocation.locationName}
            avgScore={selectedLocation.avgScore}
            audits={selectedLocation.audits.map(a => ({
              overall_score: a.overall_score,
              audit_date: a.audit_date,
            }))}
            trend={selectedLocation.overallTrend}
          />
        </DashboardPreviewDialog>
      )}
    </>
  );
};
