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
import { EvidenceCaptureModal } from "@/components/evidence/EvidenceCaptureModal";
import { EvidenceStatusBadge } from "@/components/evidence/EvidenceStatusBadge";
import { useEvidencePolicy, useEvidencePackets } from "@/hooks/useEvidencePackets";

const PerformAudit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  const { data: audit } = useAuditNew(id);
  const { data: sections } = useAuditSections(audit?.template_id);
  const updateAudit = useUpdateAudit();
  const completeAudit = useCompleteAudit();

  const currentSection = sections?.[currentSectionIndex];
  const { data: fields } = useAuditFields(currentSection?.id);
  const { data: responses } = useAuditFieldResponses(id);
  const saveFieldResponse = useSaveFieldResponse();

  // Evidence policy for this audit template
  const { data: evidencePolicy, isLoading: policyLoading } = useEvidencePolicy("audit_template", audit?.template_id);
  const { data: evidencePackets = [] } = useEvidencePackets("audit_item", id ?? "");
  // Only count submitted/approved packets as "valid" — rejected packets must be resubmitted
  const hasExistingEvidence = evidencePackets.some(
    (p) => p.status === "submitted" || p.status === "approved"
  );
  const latestPacket = evidencePackets[0] ?? null;
  const policyReady = !policyLoading;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (audit && audit.status === "draft") {
      updateAudit.mutate({
        id: audit.id,
        status: "in_progress",
        started_at: new Date().toISOString(),
      });
    }
  }, [audit?.id, audit?.status]);

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

  const doComplete = async () => {
    if (!id) return;

    const totalScore = responses?.reduce((sum, response) => {
      const value = response.response_value;
      if (typeof value === "number") return sum + value;
      return sum;
    }, 0) || 0;

    await completeAudit.mutateAsync({ auditId: id, totalScore });
    navigate(`/audits/${id}`);
  };

  const handleComplete = async () => {
    if (!id) return;
    // Guard: don't allow completion while the policy is still being fetched
    // This prevents the race condition where users complete before the gate loads
    if (policyLoading) return;
    // Gate: if evidence required and no proof captured yet, open modal first
    if (evidencePolicy?.evidence_required && !hasExistingEvidence) {
      setShowEvidenceModal(true);
      return;
    }
    await doComplete();
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
    <>
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

        {/* Evidence status indicator */}
        {(evidencePolicy?.evidence_required || latestPacket) && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <span className="text-sm font-medium">Proof of Work</span>
            <div className="flex items-center gap-2">
              <EvidenceStatusBadge status={latestPacket ? latestPacket.status : "none"} />
              {/* Resubmit button when proof was rejected */}
              {latestPacket?.status === "rejected" && (
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(true)}
                  className="text-xs text-primary underline underline-offset-2 hover:no-underline"
                >
                  Resubmit
                </button>
              )}
            </div>
          </div>
        )}

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
            <Button onClick={handleComplete} className="gap-2" disabled={policyLoading}>
              <CheckCircle className="h-4 w-4" />
              {policyLoading
                ? "Loading..."
                : evidencePolicy?.evidence_required && !hasExistingEvidence
                ? "Add Proof & Complete"
                : "Complete Audit"}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Evidence capture modal — gates audit completion */}
      {showEvidenceModal && id && (
        <EvidenceCaptureModal
          open={showEvidenceModal}
          subjectType="audit_item"
          subjectId={id}
          policy={evidencePolicy}
          title={`Proof required: ${audit.audit_templates?.name}`}
          onComplete={async (_packetId: string) => {
            setShowEvidenceModal(false);
            await doComplete();
          }}
          onCancel={() => setShowEvidenceModal(false)}
        />
      )}
    </>
  );
};

export default PerformAudit;
