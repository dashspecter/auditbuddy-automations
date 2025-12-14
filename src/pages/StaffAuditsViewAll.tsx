import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export default function StaffAuditsViewAll() {
  const { data: audits, isLoading } = useStaffAudits();
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleAuditClick = (audit: any) => {
    // Navigate to the staff audit detail page
    navigate(`/staff-audits/${audit.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground leading-tight">
            All Employee Audits
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-2">
            Complete history of all employee audits
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employee Audits</CardTitle>
          <CardDescription>
            Complete history of all employee audits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : audits && audits.length > 0 ? (
            <div className="space-y-3">
              {audits.map((audit) => (
                <div
                  key={audit.id}
                  onClick={() => handleAuditClick(audit)}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">
                        {audit.employees?.full_name}
                      </h3>
                      <Badge variant="staff" className="text-xs">Staff Audit</Badge>
                      <Badge variant="outline">{audit.employees?.role}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{audit.locations?.name}</span>
                      <span>•</span>
                      <span>{format(new Date(audit.audit_date), "MMM dd, yyyy")}</span>
                    </div>
                    {audit.notes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {audit.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getScoreColor(audit.score)}>
                      {audit.score}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No employee audits found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
