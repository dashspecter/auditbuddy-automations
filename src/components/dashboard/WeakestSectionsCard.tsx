import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { usePerformanceTrends } from "@/hooks/usePerformanceTrends";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface WeakestSectionsCardProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const WeakestSectionsCard = ({ dateFrom, dateTo }: WeakestSectionsCardProps) => {
  const { t } = useTranslation();
  const { sectionPerformance, isLoading } = usePerformanceTrends(undefined, dateFrom, dateTo);

  // Bottom 5 sections
  const weakest = [...sectionPerformance]
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-warning" />
            {t("dashboard.weakest.title", "Weakest Operational Areas")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-warning" />
          {t("dashboard.weakest.title", "Weakest Operational Areas")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {weakest.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t("dashboard.weakest.noData", "No section data available")}
          </div>
        ) : (
          <div className="space-y-3">
            {weakest.map((section, idx) => (
              <div key={section.sectionName} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{section.sectionName}</p>
                    <span className={`text-sm font-bold ${getScoreColor(section.avgScore)}`}>
                      {section.avgScore}%
                    </span>
                  </div>
                  <Progress value={section.avgScore} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
