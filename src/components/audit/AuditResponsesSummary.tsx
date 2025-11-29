import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, Camera, Paperclip, CheckCircle2 } from "lucide-react";
import { useAuditFieldResponses } from "@/hooks/useAuditFieldResponses";
import { useAuditSectionResponses } from "@/hooks/useAuditSectionResponses";
import FieldResponseDisplay from "./FieldResponseDisplay";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface AuditSection {
  id: string;
  name: string;
  description?: string;
  fields: Array<{
    id: string;
    name: string;
    field_type: string;
  }>;
}

interface AuditResponsesSummaryProps {
  auditId: string;
  sections: AuditSection[];
}

export default function AuditResponsesSummary({ auditId, sections }: AuditResponsesSummaryProps) {
  const { data: fieldResponses = [] } = useAuditFieldResponses(auditId);
  const { data: sectionResponses = [] } = useAuditSectionResponses(auditId);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Filter responses with content
  const responsesWithContent = fieldResponses.filter(
    fr => fr.observations || 
          (fr.audit_field_photos && fr.audit_field_photos.length > 0) || 
          (fr.audit_field_attachments && fr.audit_field_attachments.length > 0)
  );

  const sectionsWithFollowUp = sectionResponses.filter(sr => sr.follow_up_needed);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Count total items
  const totalObservations = responsesWithContent.filter(r => r.observations).length;
  const totalPhotos = fieldResponses.reduce((sum, r) => sum + (r.audit_field_photos?.length || 0), 0);
  const totalAttachments = fieldResponses.reduce((sum, r) => sum + (r.audit_field_attachments?.length || 0), 0);
  const totalFollowUps = sectionsWithFollowUp.length;

  const hasAnyContent = responsesWithContent.length > 0 || sectionsWithFollowUp.length > 0;

  if (!hasAnyContent) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Additional Information
          </CardTitle>
          <div className="flex gap-2">
            {totalObservations > 0 && (
              <Badge variant="secondary">
                <FileText className="h-3 w-3 mr-1" />
                {totalObservations} Note{totalObservations !== 1 ? 's' : ''}
              </Badge>
            )}
            {totalPhotos > 0 && (
              <Badge variant="secondary">
                <Camera className="h-3 w-3 mr-1" />
                {totalPhotos} Photo{totalPhotos !== 1 ? 's' : ''}
              </Badge>
            )}
            {totalAttachments > 0 && (
              <Badge variant="secondary">
                <Paperclip className="h-3 w-3 mr-1" />
                {totalAttachments} File{totalAttachments !== 1 ? 's' : ''}
              </Badge>
            )}
            {totalFollowUps > 0 && (
              <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {totalFollowUps} Follow-up{totalFollowUps !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Follow-up Actions */}
        {sectionsWithFollowUp.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Follow-up Actions Required
            </h3>
            {sectionsWithFollowUp.map(sectionResponse => {
              const section = sections.find(s => s.id === sectionResponse.section_id);
              return (
                <Card key={sectionResponse.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                            {section?.name || 'Unknown Section'}
                          </h4>
                          <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700">
                            Action Needed
                          </Badge>
                        </div>
                        <p className="text-sm text-orange-800 dark:text-orange-200 whitespace-pre-wrap">
                          {sectionResponse.follow_up_notes}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Field Responses by Section */}
        {sections.map(section => {
          const sectionFieldResponses = responsesWithContent.filter(fr => 
            section.fields.some(f => f.id === fr.field_id)
          );

          if (sectionFieldResponses.length === 0) return null;

          const isExpanded = expandedSections.has(section.id);

          return (
            <Collapsible
              key={section.id}
              open={isExpanded}
              onOpenChange={() => toggleSection(section.id)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full p-4 h-auto hover:bg-accent/5"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{section.name}</h3>
                        <Badge variant="secondary">
                          {sectionFieldResponses.length} item{sectionFieldResponses.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {sectionFieldResponses.map(fieldResponse => {
                      const field = section.fields.find(f => f.id === fieldResponse.field_id);
                      return (
                        <div key={fieldResponse.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                          <h4 className="font-medium mb-2 text-sm text-muted-foreground">
                            {field?.name || 'Unknown Field'}
                          </h4>
                          <FieldResponseDisplay
                            fieldResponse={fieldResponse}
                            fieldName={field?.name || ''}
                          />
                        </div>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}

        {responsesWithContent.length === 0 && sectionsWithFollowUp.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No additional information recorded for this audit.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
