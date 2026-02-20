import { Progress } from "@/components/ui/progress";
import { MapPin, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LocationDetailPopupProps {
  locationName: string;
  avgScore: number;
  audits: Array<{ overall_score: number | null; audit_date: string }>;
  trend: string;
}

export const LocationDetailPopup = ({ locationName, avgScore, audits, trend }: LocationDetailPopupProps) => {
  const { t } = useTranslation();
  const recentAudits = audits.slice(-5);
  const firstScore = audits.length > 1 ? audits[0]?.overall_score || 0 : avgScore;
  const lastScore = audits.length > 0 ? audits[audits.length - 1]?.overall_score || avgScore : avgScore;
  const change = lastScore - firstScore;

  return (
    <div className="space-y-4">
      {/* Score Summary */}
      <div className="text-center p-4 bg-destructive/10 rounded-lg">
        <div className="text-4xl font-bold text-destructive">{avgScore}%</div>
        <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
          <MapPin className="h-3 w-3" /> {locationName}
        </p>
        {change !== 0 && (
          <p className={`text-sm font-semibold mt-1 ${change > 0 ? "text-green-600" : "text-destructive"}`}>
            {change > 0 ? "+" : ""}{change}% {t("dashboard.popup.change", "change")}
          </p>
        )}
      </div>

      {/* Recent Audit Scores */}
      {recentAudits.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t("dashboard.popup.recentScores", "Recent Audit Scores")}
          </p>
          {recentAudits.map((audit, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{audit.audit_date}</span>
              <Progress value={audit.overall_score || 0} className="flex-1 h-2" />
              <span className="text-sm font-bold w-12 text-right">{audit.overall_score || 0}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
