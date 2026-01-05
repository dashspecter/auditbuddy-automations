import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, Percent } from "lucide-react";
import { useLocationAudit } from "@/hooks/useAudits";
import { useAuditTemplateFields } from "@/hooks/useAuditTemplateFields";
import { computeLocationAuditPercent } from "@/lib/locationAuditScoring";
import { format } from "date-fns";

export default function StaffLocationAuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: audit, isLoading } = useLocationAudit(id || "");

  const templateIds = useMemo(() => {
    if (!audit?.template_id) return [];
    return [audit.template_id];
  }, [audit?.template_id]);

  const { data: fieldsByTemplateId } = useAuditTemplateFields(templateIds);

  const score = useMemo(() => {
    if (!audit) return null;
    const fields = audit.template_id ? fieldsByTemplateId?.[audit.template_id] : undefined;
    const computed = computeLocationAuditPercent(fields, audit.custom_data);
    return computed ?? audit.overall_score ?? null;
  }, [audit, fieldsByTemplateId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Audit not found.</p>
          <Button className="mt-3" onClick={() => navigate("/staff/audits")}>Back</Button>
        </Card>
      </div>
    );
  }

  const statusLabel = audit.status || "draft";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-safe mt-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/staff/audits")} className="touch-target">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">Audit Details</h1>
            <p className="text-sm text-muted-foreground truncate">
              {audit.locations?.name || audit.location || "Unknown Location"}
            </p>
          </div>
        </div>

        <Card className="p-4">
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Location</div>
                <div className="font-medium truncate">
                  {audit.locations?.name || audit.location || "Unknown Location"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Date</div>
                <div className="font-medium">
                  {format(new Date(audit.audit_date || audit.created_at), "MMM d, yyyy")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <Percent className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="font-semibold text-lg">{score ?? 0}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground">Status</div>
              <Badge
                variant="outline"
                className={
                  audit.status === "compliant"
                    ? "bg-success/20 text-success border-success/30"
                    : audit.status === "non-compliant"
                      ? "bg-destructive/20 text-destructive border-destructive/30"
                      : "bg-muted text-muted-foreground border-border"
                }
              >
                {statusLabel}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
