import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, Shield } from "lucide-react";

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
  onApprove?: () => void;
  onReject?: () => void;
  isPending?: boolean;
}

export function ActionPreviewCard({ action, summary, risk, affected, onApprove, onReject, isPending = true }: ActionPreviewCardProps) {
  const riskInfo = RISK_CONFIG[risk] || RISK_CONFIG.medium;
  const RiskIcon = riskInfo.icon;

  return (
    <div className="rounded-xl border border-border bg-card p-4 my-2 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{action}</p>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 gap-1 ${riskInfo.color}`}>
          <RiskIcon className="h-3 w-3" />
          {riskInfo.label}
        </Badge>
      </div>

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

      {isPending && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={onApprove}>
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={onReject}>
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
