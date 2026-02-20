import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ArrowRight, FileCheck } from "lucide-react";
import { format, isPast } from "date-fns";
import { ResolutionReportModal } from "@/components/correctiveActions/ResolutionReportModal";
import type { CorrectiveActionItem } from "@/hooks/useCorrectiveActions";

interface MyCorrectiveActionsCardProps {
  /** The Supabase auth user_id (not employee_id) */
  userId: string;
}

/**
 * Shows open corrective action items assigned to this employee on their mobile home screen.
 * Only renders when there are open items — otherwise returns null (no empty state noise).
 * For test_fail items, shows a "Retake Test" button that navigates directly to the test.
 */
export const MyCorrectiveActionsCard = ({ userId }: MyCorrectiveActionsCardProps) => {
  const navigate = useNavigate();
  const [resolveItem, setResolveItem] = useState<{ item: CorrectiveActionItem; companyId: string; caTitle: string } | null>(null);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my_ca_items", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corrective_action_items")
        .select(`
          id,
          title,
          instructions,
          due_at,
          status,
          evidence_required,
          evidence_packet_id,
          assignee_user_id,
          assignee_role,
          corrective_action_id,
          company_id,
          completed_by,
          completed_at,
          verified_by,
          verified_at,
          verification_notes,
          created_at,
          corrective_actions (
            title,
            severity,
            source_type,
            source_id
          )
        `)
        .eq("assignee_user_id", userId)
        .in("status", ["open", "in_progress"])
        .order("due_at", { ascending: true });

      if (error) throw error;

      const rawItems = data ?? [];

      // Resolve test_id for each item:
      // - New format: source_id = "emp:{eid}:test:{testId}" → extract directly
      // - Old format: source_id = UUID (test_submission_id) → look up via test_submissions
      const isCompositeKey = (s: string) => s?.startsWith("emp:");
      const extractTestIdFromComposite = (s: string): string | null => {
        const m = s?.match(/^emp:.+:test:(.+)$/);
        return m ? m[1] : null;
      };

      const submissionIds = rawItems
        .filter((item: any) => {
          const src = item.corrective_actions?.source_id;
          return (
            item.corrective_actions?.source_type === "test_submission" &&
            src &&
            !isCompositeKey(src)
          );
        })
        .map((item: any) => item.corrective_actions.source_id as string);

      let testIdMap: Record<string, string> = {};
      if (submissionIds.length > 0) {
        const { data: submissions } = await supabase
          .from("test_submissions")
          .select("id, test_id")
          .in("id", submissionIds);
        testIdMap = Object.fromEntries((submissions ?? []).map((s: any) => [s.id, s.test_id]));
      }

      return rawItems.map((item: any) => {
        const ca = item.corrective_actions;
        const src = ca?.source_id ?? null;
        let testId: string | null = null;
        if (ca?.source_type === "test_submission" && src) {
          if (isCompositeKey(src)) {
            testId = extractTestIdFromComposite(src);
          } else {
            testId = testIdMap[src] ?? null;
          }
        }
        return { ...item, testId };
      });
    },
    staleTime: 30_000,
  });

  if (isLoading || items.length === 0) return null;

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Card className="p-4 border-destructive/40 bg-destructive/5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-destructive">Action Required</h3>
        <Badge variant="destructive" className="ml-auto">
          {items.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {items.map((item: any) => {
          const overdue = item.due_at ? isPast(new Date(item.due_at)) : false;
          const ca = item.corrective_actions;
          const isTestRetake = ca?.source_type === "test_submission" && !!item.testId;

          return (
            <div
              key={item.id}
              className="flex flex-col gap-1.5 p-3 bg-background rounded-lg border"
            >
              {/* Parent CA context */}
              {ca && (
                <div className="flex items-center gap-2">
                  <Badge variant={severityColor(ca.severity)} className="text-xs capitalize">
                    {ca.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">{ca.title}</span>
                </div>
              )}

              {/* Action item title */}
              <p className="font-medium text-sm">{item.title}</p>

              {/* Instructions if any */}
              {item.instructions && (
                <p className="text-xs text-muted-foreground line-clamp-2">{item.instructions}</p>
              )}

              {/* Due date */}
              {item.due_at && (
                <div className={`flex items-center gap-1 text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  <Clock className="h-3 w-3" />
                  {overdue ? "Overdue — " : "Due "}
                  {format(new Date(item.due_at), "MMM d, yyyy 'at' HH:mm")}
                </div>
              )}

              {/* Retake test CTA */}
              {isTestRetake && (
                <Button
                  size="sm"
                  className="mt-1 w-full"
                  onClick={() => navigate(`/staff/tests/${item.testId}`)}
                >
                  Retake Test
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}

              {/* Resolve CTA for non-test items */}
              {!isTestRetake && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 w-full gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setResolveItem({
                    item: item as unknown as CorrectiveActionItem,
                    companyId: item.company_id,
                    caTitle: ca?.title ?? "Corrective Action",
                  })}
                >
                  <FileCheck className="h-4 w-4" />
                  Resolve
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Your manager will be notified for verification.
      </p>

      {/* Resolution Report Modal */}
      {resolveItem && (
        <ResolutionReportModal
          open={!!resolveItem}
          item={resolveItem.item}
          companyId={resolveItem.companyId}
          caTitle={resolveItem.caTitle}
          onClose={() => setResolveItem(null)}
          onSuccess={() => setResolveItem(null)}
        />
      )}
    </Card>
  );
};
