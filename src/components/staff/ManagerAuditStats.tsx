import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, AlertCircle, TrendingUp, FileEdit, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const ManagerAuditStats = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const { data: auditStats, isLoading } = useQuery({
    queryKey: ["manager-audit-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get manager's company
      const { data: empData } = await supabase
        .from("employees")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!empData) return null;

      // Get completed audits this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: completedCount } = await supabase
        .from("location_audits")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("updated_at", startOfMonth.toISOString());

      // Get overdue audits
      const now = new Date().toISOString();
      const { count: overdueCount } = await supabase
        .from("scheduled_audits")
        .select("*", { count: "exact", head: true })
        .lt("scheduled_for", now)
        .eq("status", "pending");

      // Get pending review audits
      const { count: pendingCount } = await supabase
        .from("location_audits")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Get draft audits
      const { data: draftAudits } = await supabase
        .from("location_audits")
        .select(`
          id,
          created_at,
          locations:location_id (name),
          audit_templates:template_id (name)
        `)
        .eq("status", "draft")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      // Calculate average score
      const { data: recentAudits } = await supabase
        .from("location_audits")
        .select("overall_score")
        .eq("status", "completed")
        .not("overall_score", "is", null)
        .order("updated_at", { ascending: false })
        .limit(20);

      const avgScore = recentAudits && recentAudits.length > 0
        ? Math.round(recentAudits.reduce((acc, a) => acc + (a.overall_score || 0), 0) / recentAudits.length)
        : 0;

      return {
        completed: completedCount || 0,
        overdue: overdueCount || 0,
        pending: pendingCount || 0,
        avgScore,
        drafts: draftAudits || [],
      };
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
      </Card>
    );
  }

  if (!auditStats) return null;

  const hasDrafts = auditStats.drafts.length > 0;
  const hasPending = auditStats.pending > 0;
  const hasOverdue = auditStats.overdue > 0;

  return (
    <div className="space-y-3">
      {/* Pending Reviews Alert */}
      {hasPending && (
        <Card className="bg-warning/10 border-warning/30 p-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Pending Reviews</h3>
              <p className="text-xs text-muted-foreground truncate">
                {auditStats.pending} audit{auditStats.pending !== 1 ? 's' : ''} waiting
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/audits?status=pending")}>
              Review
            </Button>
          </div>
        </Card>
      )}

      {/* Overdue Alert */}
      {hasOverdue && (
        <Card className="bg-destructive/10 border-destructive/30 p-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Overdue Audits</h3>
              <p className="text-xs text-muted-foreground truncate">
                {auditStats.overdue} past deadline
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/audits-calendar")}>
              View
            </Button>
          </div>
        </Card>
      )}

      {/* Draft Audits */}
      {hasDrafts && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="w-full p-3 hover:bg-accent/5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Draft Audits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{auditStats.drafts.length}</Badge>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-2">
                {auditStats.drafts.map((draft: any) => (
                  <div
                    key={draft.id}
                    className="p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate(`/audits/${draft.id}`)}
                  >
                    <div className="font-medium text-sm truncate">
                      {draft.audit_templates?.name || "Unnamed audit"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {draft.locations?.name}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Compact Audit Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card 
          className="p-3 cursor-pointer hover:bg-accent/5 transition-colors"
          onClick={() => navigate("/audits")}
        >
          <ClipboardCheck className="h-4 w-4 text-primary mb-1" />
          <div className="text-lg font-bold">{auditStats.completed}</div>
          <div className="text-[10px] text-muted-foreground">Completed</div>
        </Card>
        <Card 
          className="p-3 cursor-pointer hover:bg-accent/5 transition-colors"
          onClick={() => navigate("/audits")}
        >
          <TrendingUp className="h-4 w-4 text-primary mb-1" />
          <div className="text-lg font-bold">{auditStats.avgScore}%</div>
          <div className="text-[10px] text-muted-foreground">Avg Score</div>
        </Card>
        <Card 
          className="p-3 cursor-pointer hover:bg-accent/5 transition-colors"
          onClick={() => navigate("/audits-calendar")}
        >
          <AlertCircle className="h-4 w-4 text-destructive mb-1" />
          <div className="text-lg font-bold">{auditStats.overdue}</div>
          <div className="text-[10px] text-muted-foreground">Overdue</div>
        </Card>
      </div>
    </div>
  );
};