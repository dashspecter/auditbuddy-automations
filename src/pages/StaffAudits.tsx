import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { StaffLeaderboard } from "@/components/StaffLeaderboard";
import { EmployeeLeaderboard } from "@/components/dashboard/EmployeeLeaderboard";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export default function StaffAudits() {
  const navigate = useNavigate();
  const { data: audits, isLoading } = useStaffAudits();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Employee Performance</h1>
            <p className="text-muted-foreground mt-2">
              Track and evaluate employee performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/staff-audit/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              New Staff Audit
            </Button>
            <Button onClick={() => navigate('/staff-audit/new')} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              New Performance Review
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EmployeeLeaderboard />
          <StaffLeaderboard />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Staff Performance Records</CardTitle>
            <CardDescription>
              Complete history of all staff performance audits
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
                No staff performance records found. Create your first one above!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
