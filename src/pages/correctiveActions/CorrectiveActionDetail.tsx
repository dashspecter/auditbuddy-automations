import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertOctagon, CheckCircle2, Clock, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCorrectiveAction, useUpdateCAStatus, useApproveAndCloseCA, getSLAPercent, isOverdue, type CAStatus } from "@/hooks/useCorrectiveActions";
import { CASeverityBadge } from "@/components/correctiveActions/CASeverityBadge";
import { CAStatusBadge } from "@/components/correctiveActions/CAStatusBadge";
import { StopTheLineBanner } from "@/components/correctiveActions/StopTheLineBanner";
import { ActionItemCard } from "@/components/correctiveActions/ActionItemCard";
import { EventTimeline } from "@/components/correctiveActions/EventTimeline";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CorrectiveActionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const { data: ca, isLoading } = useCorrectiveAction(id);
  const updateStatus = useUpdateCAStatus();
  const approveClose = useApproveAndCloseCA();

  const isManager = !!(roleData?.isAdmin || roleData?.isManager);

  // Evidence capture placeholder — in a real integration, open EvidenceCaptureModal
  const handleNeedEvidence = (item: any, onSuccess: (packetId: string) => void) => {
    toast.info("Evidence capture: open the Evidence Capture panel and attach proof, then the item will be marked done.");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!ca) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Corrective action not found.</p>
        <Button className="mt-4" onClick={() => navigate("/corrective-actions")}>Back to list</Button>
      </Card>
    );
  }

  const sla = getSLAPercent(ca.created_at, ca.due_at);
  const overdue = isOverdue(ca.due_at) && !["closed", "cancelled"].includes(ca.status);
  const allItemsVerified = (ca.items ?? []).length > 0 && (ca.items ?? []).every(i => i.status === "verified");
  const canClose = isManager && allItemsVerified && ca.status === "pending_verification";
  const canApproveClose = isManager && ca.requires_approval && allItemsVerified;

  const handleStatusChange = async (status: CAStatus) => {
    try {
      await updateStatus.mutateAsync({ id: ca.id, status, companyId: ca.company_id });
      toast.success(`Status updated to ${status.replace(/_/g, " ")}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status.";
      toast.error(message);
    }
  };

  const handleApproveClose = async () => {
    try {
      await approveClose.mutateAsync({ caId: ca.id, companyId: ca.company_id });
      toast.success("CA approved and closed.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to approve closure.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link to="/corrective-actions">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground truncate">{ca.title}</h1>
      </div>

      {/* Stop-the-line banner */}
      {ca.stop_the_line && !ca.stop_released_at && (
        <StopTheLineBanner
          ca={ca}
          locationName={ca.locations?.name}
          canRelease={isManager}
        />
      )}

      {/* CA Header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CASeverityBadge severity={ca.severity} showPulse />
                <CAStatusBadge status={ca.status} />
                {overdue && (
                  <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/30">
                    Overdue
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p><span className="font-medium text-foreground">Location:</span> {ca.locations?.name ?? "—"}</p>
                <p><span className="font-medium text-foreground">Source:</span> {ca.source_type.replace(/_/g, " ")}</p>
                <p><span className="font-medium text-foreground">Due:</span> {format(new Date(ca.due_at), "MMM dd, yyyy HH:mm")}</p>
                <p><span className="font-medium text-foreground">Created:</span> {format(new Date(ca.created_at), "MMM dd, yyyy")}</p>
                {ca.requires_approval && (
                  <p className="flex items-center gap-1 text-warning">
                    <Lock className="h-3 w-3" />
                    Requires approval to close
                  </p>
                )}
              </div>
            </div>

            <div className="min-w-[180px]">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>SLA Used</span>
                <span className={cn(sla >= 90 ? "text-destructive font-bold" : sla >= 50 ? "text-warning" : "text-success")}>
                  {sla}%
                </span>
              </div>
              <Progress
                value={sla}
                className={cn(
                  "h-2 mb-3",
                  sla >= 90 ? "[&>div]:bg-destructive" :
                  sla >= 50 ? "[&>div]:bg-warning" : "[&>div]:bg-success"
                )}
              />
              {isManager && !["closed", "cancelled"].includes(ca.status) && (
                <Select value={ca.status} onValueChange={(v) => handleStatusChange(v as CAStatus)}>
                  <SelectTrigger className="text-xs h-8 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending_verification">Pending Verification</SelectItem>
                    <SelectItem value="closed" disabled={!allItemsVerified && !ca.requires_approval}>Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {ca.description && (
            <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">{ca.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Approval section */}
      {canApproveClose && ca.status !== "closed" && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Unlock className="h-5 w-5 text-success shrink-0" />
              <div>
                <p className="font-semibold text-sm text-foreground">All items verified — ready for closure</p>
                <p className="text-xs text-muted-foreground">This CA requires manager approval to close.</p>
              </div>
            </div>
            <Button
              onClick={handleApproveClose}
              disabled={approveClose.isPending}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              {approveClose.isPending ? "Closing..." : "Approve & Close"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Items + Timeline */}
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">
            Action Items ({(ca.items ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="timeline">
            Audit Trail ({(ca.events ?? []).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4 space-y-3">
          {(ca.items ?? []).length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No action items yet.</p>
            </Card>
          ) : (
            (ca.items ?? [])
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map(item => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  companyId={ca.company_id}
                  isManager={isManager}
                  currentUserId={user?.id ?? ""}
                  caStatus={ca.status}
                  onNeedEvidence={handleNeedEvidence}
                />
              ))
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Event Timeline</CardTitle></CardHeader>
            <CardContent>
              <EventTimeline events={ca.events ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
