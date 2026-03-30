import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X, Clock, User, Pencil, Undo2 } from "lucide-react";
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
import { useTerminology } from "@/hooks/useTerminology";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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
  time_off_request_dates?: Array<{ date: string }>;
}

const TimeOffApprovals = () => {
  const { t } = useTranslation();
  const { employees } = useTerminology();
  const employeesLabelLower = employees().toLowerCase();
  const { user } = useAuth();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<TimeOffRequest | null>(null);
  const [editSelectedDates, setEditSelectedDates] = useState<Date[]>([]);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokingRequest, setRevokingRequest] = useState<TimeOffRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          ),
          time_off_request_dates(date)
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

  const handleEditDates = (request: TimeOffRequest) => {
    setEditingRequest(request);
    // Load existing dates from child table
    const dates = request.time_off_request_dates?.map(d => new Date(d.date + 'T00:00:00')) || [];
    if (dates.length === 0) {
      // Fallback to range
      const current = new Date(request.start_date);
      const end = new Date(request.end_date);
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    setEditSelectedDates(dates);
    setEditDialogOpen(true);
  };

  const submitEditDates = async () => {
    if (!editingRequest || !editStartDate || !editEndDate) return;
    if (editEndDate < editStartDate) {
      toast.error("End date must be after start date");
      return;
    }
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("time_off_requests")
        .update({
          start_date: format(editStartDate, "yyyy-MM-dd"),
          end_date: format(editEndDate, "yyyy-MM-dd"),
        })
        .eq("id", editingRequest.id);
      if (error) throw error;
      toast.success("Vacation dates updated successfully");
      setEditDialogOpen(false);
      loadRequests();
    } catch (error: any) {
      toast.error("Failed to update dates: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = (request: TimeOffRequest) => {
    setRevokingRequest(request);
    setRevokeDialogOpen(true);
  };

  const submitRevoke = async () => {
    if (!revokingRequest) return;
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("time_off_requests")
        .update({ status: "cancelled" })
        .eq("id", revokingRequest.id);
      if (error) throw error;
      toast.success("Time off request revoked");
      setRevokeDialogOpen(false);
      loadRequests();
    } catch (error: any) {
      toast.error("Failed to revoke request: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDays = (request: TimeOffRequest) => {
    if (request.time_off_request_dates && request.time_off_request_dates.length > 0) {
      return request.time_off_request_dates.length;
    }
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatRequestDates = (request: TimeOffRequest) => {
    const dates = request.time_off_request_dates;
    if (dates && dates.length > 0) {
      const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length <= 4) {
        return sorted.map(d => format(new Date(d.date + 'T00:00:00'), "MMM d")).join(", ");
      }
      return `${format(new Date(sorted[0].date + 'T00:00:00'), "MMM d")} … ${format(new Date(sorted[sorted.length - 1].date + 'T00:00:00'), "MMM d")}`;
    }
    return `${format(new Date(request.start_date), "MMM d")} - ${format(new Date(request.end_date), "MMM d, yyyy")}`;
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
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('workforce.timeOff.subtitleWithTerminology', `Review and manage ${employeesLabelLower} time off requests`)}
          </p>
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
              <p className="text-muted-foreground">{t('workforce.timeOff.noPendingWithTerminology', `No pending ${employeesLabelLower} time off requests`)}</p>
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
                          {t('workforce.timeOff.requested')} {format(new Date(request.created_at), "MMM d, h:mm a")}
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
                            {formatRequestDates(request)}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {calculateDays(request)} {t('workforce.timeOff.days')}
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
                        {t('workforce.timeOff.annualAllocation')}: {request.employees.annual_vacation_days} {t('workforce.timeOff.days')}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(request, "reject")}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t('workforce.timeOff.reject')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAction(request, "approve")}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {t('workforce.timeOff.approve')}
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
              <p className="text-muted-foreground">{t('workforce.timeOff.noHistory')}</p>
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
                      {formatRequestDates(request)}
                      <Badge variant="secondary" className="ml-2">
                        {calculateDays(request)} days
                      </Badge>
                    </div>

                    {request.reason && (
                      <p className="text-sm text-muted-foreground italic mt-2">
                        "{request.reason}"
                      </p>
                    )}

                    {request.status === "approved" && (
                      <div className="flex gap-2 mt-3 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDates(request)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit Dates
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevoke(request)}
                        >
                          <Undo2 className="h-3.5 w-3.5 mr-1" />
                          Revoke
                        </Button>
                      </div>
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
              {actionType === "approve" ? t('workforce.timeOff.approveRequest') : t('workforce.timeOff.rejectRequest')}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" 
                ? t('workforce.timeOff.approveDesc')
                : t('workforce.timeOff.rejectDesc')}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium">{selectedRequest.employees.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatRequestDates(selectedRequest)}
                  ({calculateDays(selectedRequest)} {t('workforce.timeOff.days')})
                </div>
              </div>

              {actionType === "reject" && (
                <div>
                  <Label>{t('workforce.timeOff.rejectionReason')}</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={t('workforce.timeOff.rejectionPlaceholder')}
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
                  {t('workforce.timeOff.cancel')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={submitAction}
                  variant={actionType === "reject" ? "destructive" : "default"}
                >
                  {actionType === "approve" ? t('workforce.timeOff.approve') : t('workforce.timeOff.reject')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dates Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vacation Dates</DialogTitle>
            <DialogDescription>
              Update the start and end dates for this approved time off request.
            </DialogDescription>
          </DialogHeader>

          {editingRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium">{editingRequest.employees.full_name}</div>
                <div className="text-sm text-muted-foreground capitalize">{editingRequest.request_type}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editStartDate && "text-muted-foreground")}>
                        <Calendar className="h-4 w-4 mr-2" />
                        {editStartDate ? format(editStartDate, "MMM d, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker mode="single" selected={editStartDate} onSelect={setEditStartDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editEndDate && "text-muted-foreground")}>
                        <Calendar className="h-4 w-4 mr-2" />
                        {editEndDate ? format(editEndDate, "MMM d, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker mode="single" selected={editEndDate} onSelect={setEditEndDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={submitEditDates} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Time Off</DialogTitle>
            <DialogDescription>
              This will cancel the approved time off request. The vacation days will no longer be counted.
            </DialogDescription>
          </DialogHeader>

          {revokingRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium">{revokingRequest.employees.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatRequestDates(revokingRequest)}
                  ({calculateDays(revokingRequest)} days)
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setRevokeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={submitRevoke} disabled={isSubmitting}>
                  {isSubmitting ? "Revoking..." : "Revoke Request"}
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
