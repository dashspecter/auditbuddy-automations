import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarCheck, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { EffectiveEmployeeScore } from "@/lib/effectiveScore";
import type { AttendanceLogEntry } from "@/hooks/useEmployeeDossierData";

interface Props {
  score: EffectiveEmployeeScore | null;
  logs: AttendanceLogEntry[];
}

export function AttendanceSection({ score, logs }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Attendance & Punctuality
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI row */}
        {score && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="Shifts Scheduled" value={score.shifts_scheduled} />
            <KPI label="Shifts Worked" value={score.shifts_worked} />
            <KPI label="Missed" value={score.shifts_missed} variant={score.shifts_missed > 0 ? "destructive" : "default"} />
            <KPI label="Late Arrivals" value={score.late_count} variant={score.late_count > 0 ? "warning" : "default"} />
          </div>
        )}

        {score && score.total_late_minutes > 0 && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Total late: {score.total_late_minutes} minutes
          </p>
        )}

        {/* Recent attendance logs */}
        {logs.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium mb-2">Recent Check-ins ({logs.length})</h4>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {logs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs border rounded px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{format(parseISO(log.check_in_at), "MMM d, HH:mm")}</span>
                    {log.check_out_at && (
                      <span className="text-muted-foreground">→ {format(parseISO(log.check_out_at), "HH:mm")}</span>
                    )}
                    {(log.locations as any)?.name && (
                      <span className="text-muted-foreground">@ {(log.locations as any).name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {log.is_late && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Late {log.late_minutes ? `${log.late_minutes}m` : ""}
                      </Badge>
                    )}
                    {log.auto_clocked_out && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Auto</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {logs.length === 0 && (
          <p className="text-sm text-muted-foreground">No attendance records in this period.</p>
        )}
      </CardContent>
    </Card>
  );
}

function KPI({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "destructive" | "warning" }) {
  const colorClass = variant === "destructive" ? "text-destructive" : variant === "warning" ? "text-yellow-600" : "text-foreground";
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
