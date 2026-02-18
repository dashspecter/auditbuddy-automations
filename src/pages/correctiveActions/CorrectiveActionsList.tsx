import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, AlertOctagon, CheckCircle2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useCorrectiveActions, useAllLocationRiskStates, getSLAPercent, isOverdue, type CAStatus, type CASeverity } from "@/hooks/useCorrectiveActions";
import { useLocations } from "@/hooks/useLocations";
import { CASeverityBadge } from "@/components/correctiveActions/CASeverityBadge";
import { CAStatusBadge } from "@/components/correctiveActions/CAStatusBadge";
import { CreateCADialog } from "@/components/correctiveActions/CreateCADialog";
import { InfoTooltip } from "@/components/correctiveActions/InfoTooltip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function CorrectiveActionsList() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: locations } = useLocations();
  const { data: cas = [], isLoading } = useCorrectiveActions({
    locationId: locationFilter === "all" ? undefined : locationFilter,
    status: statusFilter === "all" ? undefined : statusFilter as CAStatus,
    severity: severityFilter === "all" ? undefined : severityFilter as CASeverity,
  });
  const { data: restrictedLocations = [] } = useAllLocationRiskStates();

  const open = cas.filter(c => c.status === "open").length;
  const inProgress = cas.filter(c => c.status === "in_progress").length;
  const overdueCount = cas.filter(c => isOverdue(c.due_at) && !["closed", "cancelled"].includes(c.status)).length;
  const now = new Date();
  const closedThisMonth = cas.filter(c => {
    if (c.status !== "closed" || !c.closed_at) return false;
    const d = new Date(c.closed_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* Stop-the-line banners */}
      {restrictedLocations.map(r => (
        <div key={r.location_id} className="rounded-lg border-2 border-destructive bg-destructive/8 p-4 flex items-center gap-3">
          <AlertOctagon className="h-6 w-6 text-destructive animate-pulse shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-destructive text-sm">STOP THE LINE — Location Restricted</p>
            <p className="text-xs text-destructive/80">{r.restricted_reason}</p>
          </div>
          {r.restricted_ca_id && (
            <Link to={`/corrective-actions/${r.restricted_ca_id}`}>
              <Button variant="destructive" size="sm">View CA</Button>
            </Link>
          )}
        </div>
      ))}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Corrective Actions</h1>
            <InfoTooltip
              side="right"
              content={
                <div className="space-y-2">
                  <p className="font-semibold">What is a Corrective Action (CA)?</p>
                  <p>A CA is a formal task created to fix a problem — such as a failed audit, a repeated incident, or equipment downtime.</p>
                  <p className="text-muted-foreground">Lifecycle: <span className="font-medium text-foreground">Open → In Progress → Pending Verification → Closed</span></p>
                  <p className="italic text-muted-foreground">Example: A food safety audit fails at Store 3 → a CA is created requiring the manager to retrain staff and upload evidence within 24h.</p>
                </div>
              }
            />
          </div>
          <p className="text-muted-foreground text-sm mt-1">Track and resolve failures with verified closure</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New CA
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              Open
              <InfoTooltip content="CAs that have been created but no work has started yet. These need to be picked up and actioned." />
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{open}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              In Progress
              <InfoTooltip content="CAs where work has started — action items are being completed. The assignee is actively working on resolution." />
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{inProgress}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              Overdue
              <InfoTooltip
                content={
                  <div className="space-y-1.5">
                    <p className="font-semibold">Overdue CAs</p>
                    <p>These are CAs that have passed their due date and are not yet closed. Immediate action is required.</p>
                    <p className="italic text-muted-foreground">Example: A Critical CA was due within 4h but is still open after 6h.</p>
                  </div>
                }
              />
            </CardTitle>
          </CardHeader>
          <CardContent><div className={cn("text-2xl font-bold", overdueCount > 0 ? "text-destructive" : "text-foreground")}>{overdueCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              Closed This Month
              <InfoTooltip content="CAs successfully resolved and closed this calendar month. A higher number indicates good resolution velocity." />
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{closedThisMonth}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Locations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="pending_verification">Pending Verification</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Severities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <InfoTooltip
          side="right"
          content={
            <div className="space-y-1.5">
              <p className="font-semibold">Severity SLA deadlines</p>
              <ul className="space-y-0.5 text-muted-foreground">
                <li><span className="font-medium text-foreground">Critical</span> — must close within 4 hours</li>
                <li><span className="font-medium text-foreground">High</span> — must close within 24 hours</li>
                <li><span className="font-medium text-foreground">Medium</span> — must close within 72 hours</li>
                <li><span className="font-medium text-foreground">Low</span> — must close within 7 days</li>
              </ul>
            </div>
          }
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))
        ) : cas.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">No corrective actions found</p>
            <p className="text-muted-foreground text-sm mt-1">All clear — or adjust your filters.</p>
          </Card>
        ) : (
          cas.map(ca => {
            const sla = getSLAPercent(ca.created_at, ca.due_at);
            const overdue = isOverdue(ca.due_at) && !["closed", "cancelled"].includes(ca.status);
            return (
              <div
                key={ca.id}
                onClick={() => navigate(`/corrective-actions/${ca.id}`)}
                className={cn(
                  "rounded-lg border bg-card p-4 cursor-pointer hover:shadow-md transition-all",
                  "hover:border-primary/30",
                  ca.stop_the_line && !ca.stop_released_at && "border-destructive/40 bg-destructive/5",
                  overdue && "border-warning/40"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ca.stop_the_line && !ca.stop_released_at && (
                        <AlertOctagon className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <p className="font-semibold text-foreground truncate">{ca.title}</p>
                      <CASeverityBadge severity={ca.severity} showPulse />
                      <CAStatusBadge status={ca.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>{ca.locations?.name ?? "—"}</span>
                      <span>·</span>
                      <span className={cn(overdue && "text-destructive font-medium")}>
                        Due {format(new Date(ca.due_at), "MMM dd, HH:mm")}
                        {overdue && " (Overdue)"}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{ca.source_type.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 min-w-[120px]">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span className="flex items-center gap-1">
                          SLA
                          <InfoTooltip
                            side="left"
                            content="SLA % shows how much of the deadline has elapsed. Green = on track, Amber = at risk (>50%), Red = critical (>90%) or overdue."
                          />
                        </span>
                        <span className={cn(sla >= 90 ? "text-destructive" : sla >= 50 ? "text-warning" : "text-success")}>
                          {sla}%
                        </span>
                      </div>
                      <Progress
                        value={sla}
                        className={cn(
                          "h-1.5",
                          sla >= 100 ? "[&>div]:bg-destructive" :
                          sla >= 90 ? "[&>div]:bg-destructive" :
                          sla >= 50 ? "[&>div]:bg-warning" :
                          "[&>div]:bg-success"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <CreateCADialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => navigate(`/corrective-actions/${id}`)} />
    </div>
  );
}
