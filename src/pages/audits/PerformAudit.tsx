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
import CollaboratorBar from "@/components/audit/CollaboratorBar";
import { ChevronLeft, ChevronRight, CheckCircle, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EvidenceCaptureModal } from "@/components/evidence/EvidenceCaptureModal";
import { EvidencePacketViewer } from "@/components/evidence/EvidencePacketViewer";
import { EvidenceStatusBadge } from "@/components/evidence/EvidenceStatusBadge";
import { useEvidencePolicy, useEvidencePackets } from "@/hooks/useEvidencePackets";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const PerformAudit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showEvidenceViewer, setShowEvidenceViewer] = useState(false);

  // Role-based evidence controls
  const { data: rolesData } = useUserRoles();
  const canReview = !!(rolesData?.isManager || rolesData?.isAdmin || rolesData?.companyRole === 'company_owner' || rolesData?.companyRole === 'company_admin');
  const canRedact = !!(rolesData?.isAdmin || rolesData?.companyRole === 'company_owner');

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
  const hasExistingEvidence = evidencePackets.some(
    (p) => p.status === "submitted" || p.status === "approved"
  );
  const latestPacket = evidencePackets[0] ?? null;
  const policyReady = !policyLoading;

  // Realtime subscription for collaborative editing
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`audit-responses-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "audit_field_responses",
          filter: `audit_id=eq.${id}`,
        },
        (payload) => {
          // Another user saved a response — refresh our data
          queryClient.invalidateQueries({ queryKey: ["audit_field_responses", id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

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
    if (policyLoading) return;
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

        {/* Collaborator presence bar */}
        <CollaboratorBar auditId={id!} />

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
              {latestPacket && (
                <button
                  type="button"
                  onClick={() => setShowEvidenceViewer(true)}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  title="View proof"
                >
                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
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

      {/* Evidence capture modal */}
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

      {/* Evidence packet viewer */}
      {id && (
        <EvidencePacketViewer
          open={showEvidenceViewer}
          onClose={() => setShowEvidenceViewer(false)}
          subjectType="audit_item"
          subjectId={id}
          canReview={canReview}
          canRedact={canRedact}
          onResubmit={() => {
            setShowEvidenceViewer(false);
            setShowEvidenceModal(true);
          }}
        />
      )}
    </>
  );
};

export default PerformAudit;
