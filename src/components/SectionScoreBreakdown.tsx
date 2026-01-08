import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuditFieldResponses } from "@/hooks/useAuditFieldResponses";
import { useAuditSectionResponses } from "@/hooks/useAuditSectionResponses";
import FieldResponseDisplay from "@/components/audit/FieldResponseDisplay";

interface AuditField {
  id: string;
  name: string;
  field_type: string;
  options?: {
    max?: number;
    [key: string]: any;
  };
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
  auditId?: string;
  className?: string;
}

interface SectionScore {
  id: string;
  name: string;
  score: number;
  totalRatings: number;
  ratingCount: number;
  maxPossibleScore: number;
  status: 'excellent' | 'good' | 'needs-improvement' | 'critical';
  fields: Array<{
    id: string;
    name: string;
    value: any;
    type: string;
    maxValue?: number;
  }>;
}

export const SectionScoreBreakdown = ({ 
  sections, 
  customData,
  auditId,
  className 
}: SectionScoreBreakdownProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { data: fieldResponses = [] } = useAuditFieldResponses(auditId);
  const { data: sectionResponses = [] } = useAuditSectionResponses(auditId);

  const sectionScores = useMemo(() => {
    const scores: SectionScore[] = [];

    sections.forEach(section => {
      let totalRatings = 0;
      let maxPossibleScore = 0;
      let ratingCount = 0;
      const fieldDetails: SectionScore['fields'] = [];

      section.fields.forEach(field => {
        const value = customData[field.id];
        const maxValue = field.options?.max || 5;
        
        if (field.field_type === 'rating') {
          if (typeof value === 'number') {
            totalRatings += value;
            maxPossibleScore += maxValue;
            ratingCount++;
          }
        }
        
        // Add all fields to the details, not just ratings
        fieldDetails.push({
          id: field.id,
          name: field.name,
          value: value,
          type: field.field_type,
          maxValue: field.field_type === 'rating' ? maxValue : undefined
        });
      });

      // Calculate score if there are ratings, otherwise show 0
      let sectionScore = 0;
      if (ratingCount > 0 && maxPossibleScore > 0) {
        sectionScore = Math.round((totalRatings / maxPossibleScore) * 100);
      }
      
      let status: SectionScore['status'];
      if (sectionScore >= 90) status = 'excellent';
      else if (sectionScore >= 80) status = 'good';
      else if (sectionScore >= 60) status = 'needs-improvement';
      else status = 'critical';

      // Include ALL sections, even those without rating fields
      scores.push({
        id: section.id,
        name: section.name,
        score: sectionScore,
        totalRatings,
        ratingCount,
        maxPossibleScore,
        status,
        fields: fieldDetails
      });
    });

    // Sort: sections with ratings first (by score), then sections without ratings
    return scores.sort((a, b) => {
      if (a.ratingCount > 0 && b.ratingCount === 0) return -1;
      if (a.ratingCount === 0 && b.ratingCount > 0) return 1;
      if (a.ratingCount > 0 && b.ratingCount > 0) return b.score - a.score;
      return 0;
    });
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

  const formatFieldValue = (value: any, type: string, maxValue?: number) => {
    if (value === null || value === undefined) return 'Not answered';
    
    switch (type) {
      case 'rating':
        return `${value}/${maxValue || 5}`;
      case 'yes_no':
      case 'yesno':
      case 'checkbox':
        return value === true || value === 'yes' || value === 'Yes' ? 'Yes' : 'No';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'number':
        return typeof value === 'number' ? value.toString() : value;
      case 'text':
      case 'textarea':
        return value.toString();
      default:
        return value?.toString() || 'Not answered';
    }
  };

  const getRatingColor = (value: number) => {
    if (value >= 4) return 'text-success';
    if (value >= 3) return 'text-primary';
    if (value >= 2) return 'text-warning';
    return 'text-destructive';
  };

  if (sectionScores.length === 0 || sections.length === 0) {
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
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 w-full">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getStatusIcon(section.status)}
                        <div className="flex-1 text-left min-w-0">
                          <h4 className="font-medium text-foreground">{section.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {section.ratingCount} {section.ratingCount === 1 ? 'field' : 'fields'} evaluated
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 justify-between sm:justify-end w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${getScoreColor(section.score)}`}>
                            {section.score}%
                          </span>
                          {getStatusBadge(section.status)}
                        </div>
                        {expandedSection === section.name ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <Progress value={section.score} className="h-2" />
                
                <CollapsibleContent className="pt-4 space-y-3">
                  <div className="border-t border-border pt-3">
                    <h5 className="text-sm font-semibold text-foreground mb-3">Field Details</h5>
                    <div className="space-y-3">
                      {section.fields.map((field) => {
                        const fieldResponse = fieldResponses.find(fr => fr.field_id === field.id);
                        return (
                          <div key={field.id} className="space-y-2">
                            <div 
                              className="flex items-center justify-between p-2 rounded bg-secondary/30 text-sm"
                            >
                              <span className="text-muted-foreground">{field.name}</span>
                              <span className={`font-medium ${
                                field.type === 'rating' && typeof field.value === 'number'
                                  ? getRatingColor(field.value)
                                  : 'text-foreground'
                              }`}>
                                {formatFieldValue(field.value, field.type, field.maxValue)}
                              </span>
                            </div>
                            {fieldResponse && (
                              <FieldResponseDisplay
                                fieldResponse={fieldResponse}
                                fieldName={field.name}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Follow-up Actions */}
                  {(() => {
                    const sectionResponse = sectionResponses.find(sr => sr.section_id === section.id);
                    if (sectionResponse?.follow_up_needed) {
                      return (
                        <div className="border-t border-border pt-3">
                          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                                    Follow-up Actions Required
                                  </h5>
                                  <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700">
                                    Action Needed
                                  </Badge>
                                </div>
                                <p className="text-sm text-orange-800 dark:text-orange-200 whitespace-pre-wrap">
                                  {sectionResponse.follow_up_notes}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
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
