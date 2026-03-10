import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { WarningEntry } from "@/hooks/useEmployeeDossierData";

interface Props {
  warnings: WarningEntry[];
  warningPenalty: number;
}

function formatEventType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function WarningsSection({ warnings, warningPenalty }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          Warnings
          {warnings.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">{warnings.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {warningPenalty > 0 && (
          <p className="text-sm text-destructive font-medium">
            Score penalty: -{warningPenalty.toFixed(1)} points
          </p>
        )}

        {warnings.length > 0 ? (
          <div className="space-y-1.5">
            {warnings.map((w) => (
              <div key={w.id} className="flex items-center justify-between text-xs border border-destructive/20 rounded px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{format(parseISO(w.event_date), "MMM d, yyyy")}</span>
                  <Badge variant="outline" className="text-[10px]">{formatEventType(w.event_type)}</Badge>
                </div>
                <span className="text-muted-foreground truncate max-w-[200px]">{w.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No warnings in this period.</p>
        )}
      </CardContent>
    </Card>
  );
}
