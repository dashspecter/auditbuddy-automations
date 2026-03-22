import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ExecutionResultCardProps {
  status: "success" | "failure" | "partial";
  title: string;
  summary: string;
  changes?: string[];
  errors?: string[];
}

const STATUS_CONFIG = {
  success: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40", badge: "bg-green-100 text-green-700" },
  failure: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40", badge: "bg-red-100 text-red-700" },
  partial: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40", badge: "bg-amber-100 text-amber-700" },
};

export function ExecutionResultCard({ status, title, summary, changes, errors }: ExecutionResultCardProps) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-4 my-2 space-y-2 ${cfg.bg}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <Badge className={`text-[10px] ${cfg.badge}`}>
              {status === "success" ? "Completed" : status === "failure" ? "Failed" : "Partial"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>
        </div>
      </div>

      {changes && changes.length > 0 && (
        <ul className="text-xs space-y-0.5 ml-7">
          {changes.map((c, i) => (
            <li key={i} className="text-green-700 dark:text-green-400">✓ {c}</li>
          ))}
        </ul>
      )}

      {errors && errors.length > 0 && (
        <ul className="text-xs space-y-0.5 ml-7">
          {errors.map((e, i) => (
            <li key={i} className="text-red-600 dark:text-red-400">✗ {e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
