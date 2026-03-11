import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ClipboardCheck, ArrowRight } from "lucide-react";
import { useApprovalRequests, useApproveOrReject } from "@/hooks/useApprovals";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const PendingApprovalsWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: requests, isLoading } = useApprovalRequests("pending");
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (requestId: string, stepOrder: number) => {
    setProcessingId(requestId);
    try {
      await approveMutation.mutateAsync({ requestId, stepOrder, comment: "" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string, stepOrder: number) => {
    setProcessingId(requestId);
    try {
      await rejectMutation.mutateAsync({ requestId, stepOrder, comment: "" });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Pending Approvals
          </CardTitle>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">{pendingCount}</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/approvals")}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !requests?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending approvals. All clear! ✓
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {requests.slice(0, 5).map((req: any) => (
              <div key={req.id} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{req.entity_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.entity_type} • Step {req.current_step} • {format(new Date(req.created_at), "MMM d")}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-success hover:text-success hover:bg-success/10"
                    onClick={() => handleApprove(req.id, req.current_step)}
                    disabled={processingId === req.id}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleReject(req.id, req.current_step)}
                    disabled={processingId === req.id}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {requests.length > 5 && (
              <Button variant="link" size="sm" className="w-full" onClick={() => navigate("/approvals")}>
                View all {requests.length} pending approvals
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
