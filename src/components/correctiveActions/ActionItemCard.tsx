import { useState } from "react";
import { Camera, CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CAStatusBadge } from "./CAStatusBadge";
import { useCompleteActionItem, useVerifyActionItem, type CorrectiveActionItem } from "@/hooks/useCorrectiveActions";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  store_manager: "Store Manager",
  area_manager: "Area Manager",
  company_admin: "Company Admin",
  company_owner: "Company Owner",
  shift_lead: "Shift Lead",
  staff: "Staff",
};

interface ActionItemCardProps {
  item: CorrectiveActionItem;
  companyId: string;
  isManager: boolean;
  currentUserId: string;
  caStatus?: string;
  onNeedEvidence: (item: CorrectiveActionItem, onSuccess: (packetId: string) => void) => void;
}

export function ActionItemCard({ item, companyId, isManager, currentUserId, caStatus, onNeedEvidence }: ActionItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState<"verified" | "rejected">("verified");
  const [verifyNotes, setVerifyNotes] = useState("");

  const complete = useCompleteActionItem();
  const verify = useVerifyActionItem();

  const isCAClosed = caStatus === "closed" || caStatus === "cancelled";
  const canComplete =
    !isCAClosed && (item.status === "open" || item.status === "in_progress");
  const canVerify = isManager && item.status === "done" && !isCAClosed;
  const isDone = item.status === "verified" || (isCAClosed && item.status === "done");
  const isRejected = item.status === "rejected";
  const isOverdue = new Date(item.due_at) < new Date() && !isDone;

  const handleComplete = () => {
    if (item.evidence_required) {
      onNeedEvidence(item, async (packetId) => {
        try {
          await complete.mutateAsync({ item, evidencePacketId: packetId, companyId });
          toast.success("Item marked as done.");
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to complete item.";
          toast.error(message);
        }
      });
    } else {
      complete.mutate(
        { item, companyId },
        {
          onSuccess: () => toast.success("Item marked as done."),
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const handleVerify = async () => {
    try {
      await verify.mutateAsync({ item, action: verifyAction, notes: verifyNotes, companyId });
      toast.success(verifyAction === "verified" ? "Item verified." : "Item rejected.");
      setVerifyOpen(false);
      setVerifyNotes("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to verify item.";
      toast.error(message);
    }
  };

  const statusIcon = {
    open: <Clock className="h-4 w-4 text-muted-foreground" />,
    in_progress: <Clock className="h-4 w-4 text-warning" />,
    done: <AlertCircle className="h-4 w-4 text-primary" />,
    verified: <CheckCircle2 className="h-4 w-4 text-success" />,
    rejected: <XCircle className="h-4 w-4 text-destructive" />,
  }[item.status];

  return (
    <>
      <div className={cn(
        "rounded-lg border bg-card p-4 transition-colors",
        isDone && "border-success/30 bg-success/5",
        isRejected && "border-destructive/30 bg-destructive/5",
        isOverdue && !isDone && "border-warning/40"
      )}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{statusIcon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <p className={cn(
                "font-medium text-sm text-foreground",
                isDone && "line-through text-muted-foreground"
              )}>
                {item.title}
              </p>
              <div className="flex items-center gap-2">
                {item.evidence_required && (
                  <Badge variant="outline" className={cn(
                    "text-xs gap-1",
                    item.evidence_packet_id
                      ? "border-success/40 text-success bg-success/10"
                      : "border-warning/40 text-warning bg-warning/10"
                  )}>
                    <Camera className="h-3 w-3" />
                    {item.evidence_packet_id ? "Evidence attached" : "Evidence required"}
                  </Badge>
                )}
                <CAStatusBadge status={item.status as any} />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">Due {format(new Date(item.due_at), "MMM dd, HH:mm")}</span>
              {isOverdue && !isDone && (
                <Badge variant="outline" className="text-xs border-warning/40 text-warning bg-warning/10">
                  Overdue
                </Badge>
              )}
              {item.assignee_role && (
                <Badge variant="outline" className="text-xs flex items-center gap-1 border-primary/30 text-primary bg-primary/5">
                  <UserCheck className="h-3 w-3" />
                  {ROLE_LABELS[item.assignee_role] ?? item.assignee_role}
                </Badge>
              )}
              {!item.assignee_role && (
                <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
              )}
            </div>

            {item.instructions && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="text-xs text-primary flex items-center gap-1"
                >
                  Instructions {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {expanded && (
                  <p className="text-xs text-muted-foreground mt-1 bg-muted rounded p-2">
                    {item.instructions}
                  </p>
                )}
              </div>
            )}

            {/* Staff resolution notes */}
            {item.completion_notes && (item.status === "done" || item.status === "verified") && (
              <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded text-xs">
                <span className="font-medium text-foreground">Staff resolution: </span>
                <span className="text-muted-foreground">{item.completion_notes}</span>
              </div>
            )}

            {item.verification_notes && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                Verifier note: {item.verification_notes}
              </p>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              {canComplete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleComplete}
                  disabled={complete.isPending}
                  className="text-xs gap-1.5"
                >
                  {item.evidence_required && <Camera className="h-3 w-3" />}
                  {complete.isPending ? "Saving..." : "Mark Done"}
                </Button>
              )}
              {canVerify && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => { setVerifyAction("verified"); setVerifyOpen(true); }}
                    className="text-xs"
                  >
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setVerifyAction("rejected"); setVerifyOpen(true); }}
                    className="text-xs border-destructive text-destructive hover:bg-destructive/10"
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifyAction === "verified" ? "Verify Item" : "Reject Item"}
            </DialogTitle>
            <DialogDescription>
              {verifyAction === "verified"
                ? "Confirm that this action item has been completed satisfactorily."
                : "Reject this item and require re-submission."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <p className="text-sm font-medium mb-1">Notes (optional)</p>
            <Textarea
              placeholder="Add verification notes..."
              value={verifyNotes}
              onChange={e => setVerifyNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>Cancel</Button>
            <Button
              variant={verifyAction === "verified" ? "default" : "destructive"}
              onClick={handleVerify}
              disabled={verify.isPending}
            >
              {verify.isPending ? "Saving..." : verifyAction === "verified" ? "Confirm Verify" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
