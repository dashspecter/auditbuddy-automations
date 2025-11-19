import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface AuditField {
  id: string;
  name: string;
  field_type: string;
}

interface AuditSection {
  id: string;
  name: string;
  description?: string;
  fields: AuditField[];
}

interface SectionScoreBreakdownProps {
  sections: AuditSection[];
  customData: Record<string, any>;
  className?: string;
}

interface SectionScore {
  name: string;
  score: number;
  totalRatings: number;
  ratingCount: number;
  status: 'excellent' | 'good' | 'needs-improvement' | 'critical';
}

export const SectionScoreBreakdown = ({ 
  sections, 
  customData, 
  className 
}: SectionScoreBreakdownProps) => {
  const sectionScores = useMemo(() => {
    const scores: SectionScore[] = [];

    sections.forEach(section => {
      let totalRatings = 0;
      let ratingCount = 0;

      section.fields.forEach(field => {
        if (field.field_type === 'rating') {
          const value = customData[field.id];
          if (typeof value === 'number') {
            totalRatings += value;
            ratingCount++;
          }
        }
      });

      if (ratingCount > 0) {
        const sectionScore = Math.round((totalRatings / (ratingCount * 5)) * 100);
        let status: SectionScore['status'];
        
        if (sectionScore >= 90) status = 'excellent';
        else if (sectionScore >= 80) status = 'good';
        else if (sectionScore >= 60) status = 'needs-improvement';
        else status = 'critical';

        scores.push({
          name: section.name,
          score: sectionScore,
          totalRatings,
          ratingCount,
          status
        });
      }
    });

    return scores.sort((a, b) => b.score - a.score);
  }, [sections, customData]);

  const getStatusIcon = (status: SectionScore['status']) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'good':
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case 'needs-improvement':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusBadge = (status: SectionScore['status']) => {
    const variants = {
      'excellent': 'default',
      'good': 'secondary',
      'needs-improvement': 'outline',
      'critical': 'destructive'
    } as const;

    const labels = {
      'excellent': 'Excellent',
      'good': 'Good',
      'needs-improvement': 'Needs Improvement',
      'critical': 'Critical'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  if (sectionScores.length === 0) {
    return null;
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Section Performance
          </h3>
          <p className="text-sm text-muted-foreground">
            Breakdown of scores by section to identify strengths and areas for improvement
          </p>
        </div>

        <div className="space-y-4">
          {sectionScores.map((section) => (
            <div 
              key={section.name} 
              className="space-y-2 p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(section.status)}
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{section.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {section.ratingCount} {section.ratingCount === 1 ? 'field' : 'fields'} evaluated
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-2xl font-bold ${getScoreColor(section.score)}`}>
                    {section.score}%
                  </span>
                  {getStatusBadge(section.status)}
                </div>
              </div>
              <Progress value={section.score} className="h-2" />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Best Performing</p>
              <p className="font-medium text-foreground">{sectionScores[0].name}</p>
              <p className="text-xs text-muted-foreground">{sectionScores[0].score}% score</p>
            </div>
            {sectionScores.length > 1 && (
              <div>
                <p className="text-muted-foreground mb-1">Needs Most Attention</p>
                <p className="font-medium text-foreground">
                  {sectionScores[sectionScores.length - 1].name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sectionScores[sectionScores.length - 1].score}% score
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
