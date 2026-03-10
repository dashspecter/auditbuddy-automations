import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import type { StaffAudit } from "@/hooks/useStaffAudits";

interface Props {
  audits: StaffAudit[];
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
}

export function AuditsSection({ audits }: Props) {
  const navigate = useNavigate();
  const avgScore = audits.length > 0
    ? Math.round(audits.reduce((sum, a) => sum + a.score, 0) / audits.length)
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Employee Audits
          {audits.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{audits.length} audit{audits.length !== 1 ? "s" : ""}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {avgScore !== null && (
          <p className="text-sm text-muted-foreground">
            Average audit score: <span className="font-semibold text-foreground">{avgScore}%</span>
          </p>
        )}

        {audits.length > 0 ? (
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {audits.slice(0, 15).map((audit) => (
              <div
                key={audit.id}
                className="flex items-center justify-between text-xs border rounded px-2 py-1.5 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/staff-audits/${audit.id}`)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{format(parseISO(audit.audit_date), "MMM d, yyyy")}</span>
                  {audit.locations?.name && (
                    <span className="text-muted-foreground">@ {audit.locations.name}</span>
                  )}
                </div>
                <Badge variant={getScoreBadgeVariant(audit.score)} className="text-[10px]">
                  {audit.score}%
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No audits recorded.</p>
        )}
      </CardContent>
    </Card>
  );
}
