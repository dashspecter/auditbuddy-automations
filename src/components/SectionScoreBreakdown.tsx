import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

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
  fields: Array<{
    id: string;
    name: string;
    value: any;
    type: string;
  }>;
}

export const SectionScoreBreakdown = ({ 
  sections, 
  customData, 
  className 
}: SectionScoreBreakdownProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sectionScores = useMemo(() => {
    const scores: SectionScore[] = [];

    sections.forEach(section => {
      let totalRatings = 0;
      let ratingCount = 0;
      const fieldDetails: SectionScore['fields'] = [];

      section.fields.forEach(field => {
        const value = customData[field.id];
        
        if (field.field_type === 'rating') {
          if (typeof value === 'number') {
            totalRatings += value;
            ratingCount++;
          }
        }
        
        // Add all fields to the details, not just ratings
        fieldDetails.push({
          id: field.id,
          name: field.name,
          value: value,
          type: field.field_type
        });
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
          status,
          fields: fieldDetails
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

  const formatFieldValue = (value: any, type: string) => {
    if (value === null || value === undefined) return 'Not answered';
    
    switch (type) {
      case 'rating':
        return `${value}/5`;
      case 'yes_no':
        return value ? 'Yes' : 'No';
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return value.toString();
    }
  };

  const getRatingColor = (value: number) => {
    if (value >= 4) return 'text-success';
    if (value >= 3) return 'text-primary';
    if (value >= 2) return 'text-warning';
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
            <Collapsible 
              key={section.name}
              open={expandedSection === section.name}
              onOpenChange={(open) => setExpandedSection(open ? section.name : null)}
            >
              <div className="space-y-2 p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full p-0 h-auto hover:bg-transparent"
                  >
                    <div className="flex items-start justify-between gap-4 w-full">
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(section.status)}
                        <div className="flex-1 text-left">
                          <h4 className="font-medium text-foreground">{section.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {section.ratingCount} {section.ratingCount === 1 ? 'field' : 'fields'} evaluated
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-2xl font-bold ${getScoreColor(section.score)}`}>
                            {section.score}%
                          </span>
                          {getStatusBadge(section.status)}
                        </div>
                        {expandedSection === section.name ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <Progress value={section.score} className="h-2" />
                
                <CollapsibleContent className="pt-4 space-y-3">
                  <div className="border-t border-border pt-3">
                    <h5 className="text-sm font-semibold text-foreground mb-3">Field Details</h5>
                    <div className="space-y-2">
                      {section.fields.map((field) => (
                        <div 
                          key={field.id} 
                          className="flex items-center justify-between p-2 rounded bg-secondary/30 text-sm"
                        >
                          <span className="text-muted-foreground">{field.name}</span>
                          <span className={`font-medium ${
                            field.type === 'rating' && typeof field.value === 'number'
                              ? getRatingColor(field.value)
                              : 'text-foreground'
                          }`}>
                            {formatFieldValue(field.value, field.type)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
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
