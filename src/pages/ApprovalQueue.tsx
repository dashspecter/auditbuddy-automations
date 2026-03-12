import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useApprovalRequests, useApproveOrReject, ApprovalRequest } from "@/hooks/useApprovals";
import { CheckCircle2, XCircle, Clock, Loader2, FileText, ArrowRight, HelpCircle } from "lucide-react";
import { format } from "date-fns";

export default function ApprovalQueue() {
  const { data: allRequests = [], isLoading } = useApprovalRequests();
  const approveOrReject = useApproveOrReject();
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [comment, setComment] = useState("");

  const pendingRequests = allRequests.filter((r) => r.status === "pending");
  const completedRequests = allRequests.filter((r) => r.status !== "pending");

  const handleDecision = async () => {
    if (!selectedRequest || !decision) return;

    await approveOrReject.mutateAsync({
      request_id: selectedRequest.id,
      step_order: selectedRequest.current_step,
      decision,
      comment: comment || undefined,
    });

    setSelectedRequest(null);
    setDecision(null);
    setComment("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="text-emerald-600 border-emerald-300"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600 border-red-300"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStepLabel = (request: ApprovalRequest) => {
    if (!request.workflow?.steps) return `Step ${request.current_step}`;
    const steps = typeof request.workflow.steps === 'string'
      ? JSON.parse(request.workflow.steps)
      : request.workflow.steps;
    const currentStepData = steps.find((s: any) => s.step_order === request.current_step);
    return currentStepData?.label || `Step ${request.current_step}`;
  };

  const renderRequestCard = (request: ApprovalRequest) => (
    <Card key={request.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="font-medium text-foreground truncate">{request.entity_title}</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{request.entity_type}</span>
              <ArrowRight className="h-3 w-3" />
              <span>{request.workflow?.name || "Unknown workflow"}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Current: {getStepLabel(request)}</span>
              <span>•</span>
              <span>{format(new Date(request.created_at), "MMM d, yyyy HH:mm")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge(request.status)}
            {request.status === "pending" && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => {
                    setSelectedRequest(request);
                    setDecision("approved");
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    setSelectedRequest(request);
                    setDecision("rejected");
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Approval Queue</h1>
          <p className="text-muted-foreground">Review and process pending approval requests.</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help mt-1" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[280px]">
              <p className="text-xs">Requests flow through multi-step workflows (e.g., Clerk → Department Head → Mayor). Each step must be approved before the request advances. You'll only see items awaiting your decision.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pendingRequests.length > 0 && `(${pendingRequests.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed {completedRequests.length > 0 && `(${completedRequests.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-muted-foreground">No pending approvals. You're all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map(renderRequestCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {completedRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No completed requests yet.</p>
              </CardContent>
            </Card>
          ) : (
            completedRequests.map(renderRequestCard)
          )}
        </TabsContent>
      </Tabs>

      {/* Decision Dialog */}
      <Dialog open={!!selectedRequest && !!decision} onOpenChange={() => {
        setSelectedRequest(null);
        setDecision(null);
        setComment("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approved" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.entity_title} — {getStepLabel(selectedRequest!)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Comment (optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment about your decision..."
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setDecision(null);
                setComment("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDecision}
              disabled={approveOrReject.isPending}
              className={decision === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
            >
              {approveOrReject.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {decision === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
