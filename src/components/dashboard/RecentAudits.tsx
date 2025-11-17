import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useLocationAudits, useStaffAudits } from "@/hooks/useAudits";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export const RecentAudits = () => {
  const { data: locationAudits, isLoading: locationLoading } = useLocationAudits();
  const { data: staffAudits, isLoading: staffLoading } = useStaffAudits();

  const allAudits = [
    ...(locationAudits || []).map(audit => ({ ...audit, type: 'location' as const })),
    ...(staffAudits || []).map(audit => ({ ...audit, type: 'staff' as const })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  const isLoading = locationLoading || staffLoading;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Audits</h3>
      {isLoading ? (
        <div className="text-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading audits...</p>
        </div>
      ) : allAudits.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No audits yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allAudits.map((audit) => (
            <Link
              key={audit.id}
              to={`/audits/${audit.id}`}
              className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors block"
            >
              <div className="space-y-1">
                <p className="font-medium text-foreground">{audit.location}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(audit.audit_date), 'MMM dd, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {audit.overall_score !== null && audit.overall_score !== undefined && (
                  <span className="text-lg font-bold text-foreground">
                    {audit.overall_score}%
                  </span>
                )}
                {audit.status === "compliant" && (
                  <Badge className="bg-success text-success-foreground gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Compliant
                  </Badge>
                )}
                {audit.status === "non-compliant" && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Issues Found
                  </Badge>
                )}
                {audit.status === "pending" && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
};
