import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationAudits } from "@/hooks/useAudits";
import { useAuditTemplateFields } from "@/hooks/useAuditTemplateFields";
import { computeLocationAuditPercent } from "@/lib/locationAuditScoring";
import { format } from "date-fns";

export default function StaffLocationAudits() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: allAudits = [], isLoading } = useLocationAudits();

  const myAudits = useMemo(() => {
    if (!user) return [];
    return allAudits
      .filter((a) => a.user_id === user.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allAudits, user]);

  const templateIds = useMemo(
    () => myAudits.map((a) => a.template_id).filter(Boolean) as string[],
    [myAudits]
  );

  const { data: fieldsByTemplateId } = useAuditTemplateFields(templateIds);

  const getScore = (audit: any) => {
    const fields = audit.template_id ? fieldsByTemplateId?.[audit.template_id] : undefined;
    const computed = computeLocationAuditPercent(fields, audit.custom_data);
    return computed ?? audit.overall_score ?? null;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-safe mt-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/staff")}
            className="touch-target">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">My Audits</h1>
            <p className="text-sm text-muted-foreground">Location audits you created</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : myAudits.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No audits yet.</p>
            <Button className="mt-3" onClick={() => navigate("/staff/location-audit")}>Create Audit</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {myAudits.map((audit) => {
              const score = getScore(audit);
              return (
                <Card
                  key={audit.id}
                  className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                  onClick={() => navigate(`/staff/audits/${audit.id}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {audit.locations?.name || audit.location || "Unknown Location"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(audit.created_at), "MMM d, yyyy")}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {score !== null && (
                        <span className="text-sm font-semibold">{score}%</span>
                      )}
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
                        {audit.status || "draft"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
