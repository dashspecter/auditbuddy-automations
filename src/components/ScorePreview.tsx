import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AuditField {
  id: string;
  name: string;
  field_type: string;
  is_required: boolean;
}

interface AuditSection {
  id: string;
  name: string;
  description?: string;
  fields: AuditField[];
}

interface ScorePreviewProps {
  sections: AuditSection[];
  customData: Record<string, any>;
  className?: string;
}

const COMPLIANCE_THRESHOLD = 80;

export const ScorePreview = ({ sections, customData, className }: ScorePreviewProps) => {
  const scoreData = useMemo(() => {
    let totalRatings = 0;
    let ratingCount = 0;

    sections.forEach(section => {
      section.fields.forEach(field => {
        const value = customData[field.id];
        
        // Count rating fields (1-5 scale)
        if (field.field_type === 'rating') {
          if (typeof value === 'number') {
            totalRatings += value;
            ratingCount++;
          }
        }
        
        // Count yes/no fields (yes = 5 points, no = 0 points)
        if (field.field_type === 'yesno' || field.field_type === 'yes_no') {
          if (value === 'yes' || value === true) {
            totalRatings += 5;
            ratingCount++;
          } else if (value === 'no' || value === false) {
            totalRatings += 0;
            ratingCount++;
          }
        }
      });
    });

    const overallScore = ratingCount > 0 
      ? Math.round((totalRatings / (ratingCount * 5)) * 100) 
      : 0;

    const isCompliant = overallScore >= COMPLIANCE_THRESHOLD;
    const answeredCount = ratingCount;
    const totalFields = sections.reduce((acc, section) => {
      return acc + section.fields.filter(f => 
        f.field_type === 'rating' || f.field_type === 'yesno' || f.field_type === 'yes_no'
      ).length;
    }, 0);

    return {
      overallScore,
      isCompliant,
      answeredCount,
      totalFields,
      completionRate: totalFields > 0 ? Math.round((answeredCount / totalFields) * 100) : 0
    };
  }, [sections, customData]);

  const getScoreIcon = () => {
    if (scoreData.overallScore >= COMPLIANCE_THRESHOLD) {
      return <TrendingUp className="h-5 w-5 text-success" />;
    } else if (scoreData.overallScore >= 60) {
      return <Minus className="h-5 w-5 text-warning" />;
    } else {
      return <TrendingDown className="h-5 w-5 text-destructive" />;
    }
  };

  const getScoreColor = () => {
    if (scoreData.overallScore >= COMPLIANCE_THRESHOLD) {
      return "text-success";
    } else if (scoreData.overallScore >= 60) {
      return "text-warning";
    } else {
      return "text-destructive";
    }
  };

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Score Preview</h3>
          {getScoreIcon()}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">Current Score</span>
            <span className={`text-2xl sm:text-3xl font-bold ${getScoreColor()}`}>
              {scoreData.overallScore}%
            </span>
          </div>
          <Progress value={scoreData.overallScore} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {scoreData.isCompliant ? 'Compliant' : 'Non-Compliant'} 
            {' '}(Threshold: {COMPLIANCE_THRESHOLD}%)
          </p>
        </div>

        <div className="pt-3 sm:pt-4 border-t border-border space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">
              {scoreData.answeredCount} / {scoreData.totalFields} fields
            </span>
          </div>
          <Progress value={scoreData.completionRate} className="h-1" />
          <p className="text-xs text-muted-foreground text-right">
            {scoreData.completionRate}% complete
          </p>
        </div>

        {scoreData.answeredCount > 0 && (
          <div className="pt-3 sm:pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {scoreData.overallScore >= COMPLIANCE_THRESHOLD 
                ? "Great job! You're on track for compliance." 
                : scoreData.overallScore >= 60
                ? "Review areas with low scores to improve compliance."
                : "Several areas need attention to meet compliance standards."}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
