import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function StaffAuditsViewAll() {
  const { data: audits, isLoading } = useStaffAudits();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground leading-tight">
            All Staff Performance Records
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-2">
            Complete history of all staff performance audits
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Records</CardTitle>
          <CardDescription>
            View and manage all staff performance reviews
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
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
                      <p className="text-sm text-muted-foreground mt-2">
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
              No staff performance records found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
