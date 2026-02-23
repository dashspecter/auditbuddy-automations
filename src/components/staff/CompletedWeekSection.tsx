import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CompletedWeekSectionProps {
  title: string;
  audits: any[];
  getScore: (audit: any) => number | null;
  renderAuditCard: (audit: any) => React.ReactNode;
  alwaysOpen?: boolean;
  emptyMessage?: string;
}

export function CompletedWeekSection({
  title,
  audits,
  getScore,
  renderAuditCard,
  alwaysOpen,
  emptyMessage,
}: CompletedWeekSectionProps) {
  const [open, setOpen] = useState(!!alwaysOpen);

  const avgScore = audits.length > 0
    ? Math.round(
        audits.reduce((sum, a) => {
          const s = getScore(a);
          return sum + (s ?? 0);
        }, 0) / audits.filter((a) => getScore(a) !== null).length || 0
      )
    : null;

  if (alwaysOpen) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">
            {title} ({audits.length})
          </h2>
          {avgScore !== null && audits.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              avg {avgScore}%
            </Badge>
          )}
        </div>
        {audits.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">{audits.map(renderAuditCard)}</div>
        )}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title} ({audits.length})
        </h2>
        {avgScore !== null && audits.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            avg {avgScore}%
          </Badge>
        )}
        <ChevronDown className={`h-4 w-4 text-muted-foreground ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 mt-2">
        {audits.map(renderAuditCard)}
      </CollapsibleContent>
    </Collapsible>
  );
}
