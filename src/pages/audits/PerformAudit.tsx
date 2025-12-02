import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuditNew, useUpdateAudit, useCompleteAudit } from "@/hooks/useAuditsNew";
import { useAuditSections } from "@/hooks/useAuditSections";
import { useAuditFields } from "@/hooks/useAuditFields";
import { useAuditFieldResponses, useSaveFieldResponse } from "@/hooks/useAuditFieldResponses";
import FieldResponseInput from "@/components/audit/FieldResponseInput";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PerformAudit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const { data: audit } = useAuditNew(id);
  const { data: sections } = useAuditSections(audit?.template_id);
  const updateAudit = useUpdateAudit();
  const completeAudit = useCompleteAudit();

  const currentSection = sections?.[currentSectionIndex];
  const { data: fields } = useAuditFields(currentSection?.id);
  const { data: responses } = useAuditFieldResponses(id);
  const saveFieldResponse = useSaveFieldResponse();

  useEffect(() => {
    if (audit && audit.status === "draft") {
      updateAudit.mutate({
        id: audit.id,
        status: "in_progress",
        started_at: new Date().toISOString(),
      });
    }
  }, [audit]);

  const totalSections = sections?.length || 0;
  const progress = totalSections > 0 ? ((currentSectionIndex + 1) / totalSections) * 100 : 0;

  const handleNext = () => {
    if (currentSectionIndex < totalSections - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const handleComplete = async () => {
    if (!id) return;

    // Calculate total score from responses
    const totalScore = responses?.reduce((sum, response) => {
      const value = response.response_value;
      if (typeof value === "number") return sum + value;
      return sum;
    }, 0) || 0;

    await completeAudit.mutateAsync({ auditId: id, totalScore });
    navigate(`/audits/${id}`);
  };

  const handleObservationChange = async (fieldId: string, value: string) => {
    if (!id || !currentSection) return;

    await saveFieldResponse.mutateAsync({
      auditId: id,
      sectionId: currentSection.id,
      fieldId: fieldId,
      responseValue: null,
      observations: value,
    });
  };

  if (!audit || !sections || !currentSection) {
    return (
      <div className="text-center py-12">Loading audit...</div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">{audit.audit_templates?.name}</h1>
            <Badge>{audit.locations?.name}</Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Section {currentSectionIndex + 1} of {totalSections}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{currentSection.name}</CardTitle>
            {currentSection.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {currentSection.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {fields?.map((field) => {
              const fieldResponse = responses?.find(r => r.field_id === field.id);
              return (
                <div key={field.id} className="space-y-2">
                  <div>
                    <h3 className="font-medium">{field.name}</h3>
                    {field.is_required && (
                      <span className="text-sm text-muted-foreground">* Required</span>
                    )}
                  </div>
                  <FieldResponseInput
                    fieldId={field.id}
                    auditId={id!}
                    sectionId={currentSection.id}
                    fieldResponse={fieldResponse}
                    onObservationChange={(value) => handleObservationChange(field.id, value)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSectionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentSectionIndex === totalSections - 1 ? (
            <Button onClick={handleComplete} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Complete Audit
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
  );
};

export default PerformAudit;
