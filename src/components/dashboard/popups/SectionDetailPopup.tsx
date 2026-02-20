import { Progress } from "@/components/ui/progress";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SectionDetailPopupProps {
  sectionName: string;
  avgScore: number;
  auditCount: number;
}

export const SectionDetailPopup = ({ sectionName, avgScore, auditCount }: SectionDetailPopupProps) => {
  const { t } = useTranslation();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className={`text-center p-4 rounded-lg ${avgScore >= 60 ? "bg-warning/10" : "bg-destructive/10"}`}>
        <div className={`text-4xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</div>
        <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
          <BarChart3 className="h-3 w-3" /> {sectionName}
        </p>
      </div>

      {/* Details */}
      <div className="p-3 rounded-md bg-muted/50">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("dashboard.popup.auditsEvaluated", "Audits Evaluated")}</span>
          <span className="font-bold">{auditCount}</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("dashboard.popup.sectionScore", "Section Score")}</span>
          <span>{avgScore}%</span>
        </div>
        <Progress value={avgScore} className="h-2" />
      </div>
    </div>
  );
};
