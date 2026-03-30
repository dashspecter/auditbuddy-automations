import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, User, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface PendingRequest {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  request_type: string;
  created_at: string;
  employees: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    annual_vacation_days: number;
  };
}

export function PendingApprovalsSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadPendingRequests();
  }, [user]);

  const loadPendingRequests = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: companyData } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", authUser.id)
        .single();

      if (!companyData) return;

      const { data, error } = await supabase
        .from("time_off_requests")
        .select(`
          id, start_date, end_date, status, reason, request_type, created_at,
          employees:employee_id (id, full_name, avatar_url, annual_vacation_days),
          time_off_request_dates(date)
        `)
        .eq("company_id", companyData.company_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading pending requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (request: PendingRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const submitAction = async () => {
    if (!selectedRequest) return;
    try {
      const updates: Record<string, unknown> = {
        status: actionType === "approve" ? "approved" : "rejected",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      };
      if (actionType === "reject" && rejectionReason) {
        updates.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from("time_off_requests")
        .update(updates)
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success(
        actionType === "approve"
          ? t('staffTimeOff.requestApproved', 'Request approved')
          : t('staffTimeOff.requestRejected', 'Request rejected')
      );
      setActionDialogOpen(false);
      setRejectionReason("");
      loadPendingRequests();
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error(t('staffTimeOff.failedUpdate', 'Failed to update request'));
    }
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  if (isLoading) return null;
  if (requests.length === 0) return null;

  return (
    <>
      <div className="px-4 pt-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full mb-3"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              {t('staffTimeOff.pendingApprovals', 'Pending Approvals')}
            </h2>
            <Badge variant="destructive" className="text-xs">{requests.length}</Badge>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {request.employees.avatar_url ? (
                      <img
                        src={request.employees.avatar_url}
                        alt={request.employees.full_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium truncate">{request.employees.full_name}</div>
                      <Badge variant="outline" className="capitalize text-xs shrink-0">
                        {request.request_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {format(new Date(request.start_date), "MMM d")} – {format(new Date(request.end_date), "MMM d")}
                      <span className="ml-1">({calculateDays(request.start_date, request.end_date)}d)</span>
                    </div>
                    {request.reason && (
                      <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">"{request.reason}"</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-h-[44px]"
                        onClick={() => handleAction(request, "reject")}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t('staffTimeOff.reject', 'Reject')}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 min-h-[44px]"
                        onClick={() => handleAction(request, "approve")}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {t('staffTimeOff.approve', 'Approve')}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve"
                ? t('staffTimeOff.approveRequest', 'Approve Request')
                : t('staffTimeOff.rejectRequest', 'Reject Request')}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? t('staffTimeOff.approveDesc', 'This will approve the time off request.')
                : t('staffTimeOff.rejectDesc', 'Please provide a reason for rejection.')}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium">{selectedRequest.employees.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selectedRequest.start_date), "MMM d")} – {format(new Date(selectedRequest.end_date), "MMM d, yyyy")}
                  ({calculateDays(selectedRequest.start_date, selectedRequest.end_date)} days)
                </div>
              </div>

              {actionType === "reject" && (
                <div>
                  <Label>{t('staffTimeOff.rejectionReason', 'Reason for rejection')}</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={t('staffTimeOff.rejectionPlaceholder', 'Enter reason...')}
                    className="mt-2"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setActionDialogOpen(false)}>
                  {t('staffTimeOff.cancel', 'Cancel')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={submitAction}
                  variant={actionType === "reject" ? "destructive" : "default"}
                >
                  {actionType === "approve"
                    ? t('staffTimeOff.approve', 'Approve')
                    : t('staffTimeOff.reject', 'Reject')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
