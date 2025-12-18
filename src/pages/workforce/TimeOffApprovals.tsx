import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X, Clock, User } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TimeOffRequest {
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

const TimeOffApprovals = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Get company
      const { data: companyData } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", authUser.id)
        .single();

      if (!companyData) return;

      // Build query based on tab
      let query = supabase
        .from("time_off_requests")
        .select(`
          id,
          start_date,
          end_date,
          status,
          reason,
          request_type,
          created_at,
          employees:employee_id (
            id,
            full_name,
            avatar_url,
            annual_vacation_days
          )
        `)
        .eq("company_id", companyData.company_id)
        .order("created_at", { ascending: false });

      if (activeTab === "pending") {
        query = query.eq("status", "pending");
      } else {
        query = query.in("status", ["approved", "rejected"]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load time off requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (request: TimeOffRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const submitAction = async () => {
    if (!selectedRequest) return;

    try {
      const updates: any = {
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

      toast.success(`Time off request ${actionType === "approve" ? "approved" : "rejected"}`);
      setActionDialogOpen(false);
      setRejectionReason("");
      loadRequests();
    } catch (error: any) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{t('workforce.timeOff.title')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('workforce.timeOff.subtitle')}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            {t('workforce.timeOff.pending')}
            {requests.length > 0 && activeTab === "pending" && (
              <Badge variant="secondary" className="ml-2">{requests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <Calendar className="h-4 w-4 mr-2" />
            {t('workforce.timeOff.history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {requests.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('workforce.timeOff.noPending')}</p>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {request.employees.avatar_url ? (
                      <img 
                        src={request.employees.avatar_url} 
                        alt={request.employees.full_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{request.employees.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Requested {format(new Date(request.created_at), "MMM d, h:mm a")}
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {request.request_type}
                      </Badge>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(request.start_date), "MMM d")} - {format(new Date(request.end_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {calculateDays(request.start_date, request.end_date)} days
                        </Badge>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-muted-foreground italic mt-2">
                          "{request.reason}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Annual allocation: {request.employees.annual_vacation_days} days
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(request, "reject")}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAction(request, "approve")}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          {requests.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No time off history</p>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-start gap-4">
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

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{request.employees.full_name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {request.request_type}
                        </div>
                      </div>
                      <Badge variant={getStatusColor(request.status) as any}>
                        {request.status}
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {format(new Date(request.start_date), "MMM d")} - {format(new Date(request.end_date), "MMM d, yyyy")}
                      <Badge variant="secondary" className="ml-2">
                        {calculateDays(request.start_date, request.end_date)} days
                      </Badge>
                    </div>

                    {request.reason && (
                      <p className="text-sm text-muted-foreground italic mt-2">
                        "{request.reason}"
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve" : "Reject"} Time Off Request
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" 
                ? "This will approve the time off request and block shifts during these dates."
                : "Provide a reason for rejecting this time off request."}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium">{selectedRequest.employees.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selectedRequest.start_date), "MMM d")} - {format(new Date(selectedRequest.end_date), "MMM d, yyyy")}
                  ({calculateDays(selectedRequest.start_date, selectedRequest.end_date)} days)
                </div>
              </div>

              {actionType === "reject" && (
                <div>
                  <Label>Rejection Reason</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this request is being rejected..."
                    className="mt-2"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setActionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={submitAction}
                  variant={actionType === "reject" ? "destructive" : "default"}
                >
                  {actionType === "approve" ? "Approve" : "Reject"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeOffApprovals;
