import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, Shield, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";

const RISK_CONFIG = {
  low: { color: "bg-green-500/10 text-green-700 border-green-200", icon: Shield, label: "Low Risk" },
  medium: { color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: AlertTriangle, label: "Medium Risk" },
  high: { color: "bg-red-500/10 text-red-700 border-red-200", icon: AlertTriangle, label: "High Risk" },
};

interface ActionPreviewCardProps {
  action: string;
  summary: string;
  risk: "low" | "medium" | "high";
  affected?: string[];
  pending_action_id?: string;
  can_approve?: boolean;
  missing_fields?: string[];
  draft?: any;
  resolved_status?: string; // from session reconciliation: "approved" | "rejected" | "expired" | "executed"
  onApprove?: (pendingActionId: string) => void;
  onReject?: (pendingActionId: string) => void;
}

export function ActionPreviewCard({
  action, summary, risk, affected, pending_action_id,
  can_approve = false, missing_fields, draft, resolved_status,
  onApprove, onReject,
}: ActionPreviewCardProps) {
  // Map resolved DB status to card display status
  const initialStatus = resolved_status === "approved" || resolved_status === "executed"
    ? "approved" as const
    : resolved_status === "rejected" ? "rejected" as const
    : resolved_status === "expired" ? "rejected" as const
    : "pending" as const;
  const [status, setStatus] = useState<"pending" | "approving" | "approved" | "rejected" | "failed">(initialStatus);
  const riskInfo = RISK_CONFIG[risk] || RISK_CONFIG.medium;
  const RiskIcon = riskInfo.icon;

  const handleApprove = useCallback(() => {
    if (!pending_action_id || !onApprove || status !== "pending") return;
    setStatus("approving");
    try {
      onApprove(pending_action_id);
    } catch {
      setStatus("failed");
    }
  }, [pending_action_id, onApprove, status]);

  const handleReject = useCallback(() => {
    if (!pending_action_id || !onReject || status !== "pending") return;
    setStatus("rejected");
    onReject(pending_action_id);
  }, [pending_action_id, onReject, status]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 my-2 space-y-3 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{action || "Action Preview"}</p>
          <p className="text-xs text-muted-foreground">{summary || "Review and approve this action."}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 gap-1 ${riskInfo.color}`}>
          <RiskIcon className="h-3 w-3" />
          {riskInfo.label}
        </Badge>
      </div>

      {missing_fields && missing_fields.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-destructive">Missing required fields:</p>
          <div className="flex flex-wrap gap-1">
            {missing_fields.map((field, i) => (
              <Badge key={i} variant="destructive" className="text-xs font-normal">
                {field}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {affected && affected.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Affected:</p>
          <div className="flex flex-wrap gap-1">
            {affected.map((item, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {status === "pending" && can_approve && pending_action_id && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={handleApprove}>
            <Check className="h-3.5 w-3.5" />
            Approve & Execute
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={handleReject}>
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      )}

      {status === "approving" && (
        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Executing...
        </div>
      )}

      {status === "rejected" && (
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200 gap-1">
            <X className="h-3 w-3" />
            Rejected
          </Badge>
        </div>
      )}

      {status === "failed" && (
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Failed — check result below
          </Badge>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setStatus("pending")}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
