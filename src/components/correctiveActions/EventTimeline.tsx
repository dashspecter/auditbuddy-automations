import { format } from "date-fns";
import type { CorrectiveActionEvent } from "@/hooks/useCorrectiveActions";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  created:                { label: "Created",               color: "bg-primary" },
  status_changed:         { label: "Status Changed",        color: "bg-blue-500" },
  item_created:           { label: "Item Added",            color: "bg-primary/70" },
  item_completed:         { label: "Item Completed",        color: "bg-success" },
  item_verified:          { label: "Item Verified",         color: "bg-success" },
  item_rejected:          { label: "Item Rejected",         color: "bg-destructive" },
  escalated:              { label: "Escalated",             color: "bg-warning" },
  stop_the_line_enabled:  { label: "Stop-the-Line Enabled", color: "bg-destructive" },
  stop_released:          { label: "Stop-the-Line Released",color: "bg-success" },
  approval_requested:     { label: "Approval Requested",   color: "bg-blue-400" },
  approved:               { label: "Approved & Closed",     color: "bg-success" },
  reopened:               { label: "Reopened",              color: "bg-warning" },
  severity_changed:       { label: "Severity Changed",      color: "bg-orange-500" },
};

interface EventTimelineProps {
  events: CorrectiveActionEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (!sorted.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No events yet.</p>;
  }

  return (
    <ol className="relative border-l border-border ml-3 space-y-5">
      {sorted.map((ev, i) => {
        const meta = EVENT_LABELS[ev.event_type] ?? { label: ev.event_type, color: "bg-muted-foreground" };
        return (
          <li key={ev.id} className="ml-4">
            <span className={cn(
              "absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ring-2 ring-background",
              meta.color
            )} />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-foreground">{meta.label}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(ev.created_at), "MMM dd, yyyy HH:mm")}
              </p>
              {ev.payload && Object.keys(ev.payload).length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5 bg-muted rounded px-2 py-1 font-mono">
                  {Object.entries(ev.payload)
                    .filter(([, v]) => v !== null && v !== undefined)
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(" · ")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
