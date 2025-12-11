import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeftRight, Check, X, Clock, AlertCircle } from "lucide-react";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SwapRequest {
  id: string;
  status: string;
  requires_manager_approval: boolean;
  requester_notes: string | null;
  target_response: string | null;
  created_at: string;
  requester_assignment: {
    id: string;
    staff_id: string;
    shift_id: string;
    shifts: {
      shift_date: string;
      start_time: string;
      end_time: string;
      role: string;
      locations: {
        name: string;
      };
    };
    employees: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

const StaffSwapRequests = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [incomingRequests, setIncomingRequests] = useState<SwapRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SwapRequest | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Get current employee
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (empError) throw empError;
      setEmployee(empData);

      // Load incoming requests (where I'm the target)
      const { data: incoming, error: incomingError } = await supabase
        .from("shift_swap_requests")
        .select(`
          id,
          status,
          requires_manager_approval,
          requester_notes,
          target_response,
          created_at,
          requester_assignment:shift_assignments!requester_assignment_id (
            id,
            staff_id,
            shift_id,
            shifts (
              shift_date,
              start_time,
              end_time,
              role,
              locations (name)
            ),
            employees:staff_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq("target_staff_id", empData.id)
        .in("status", ["pending", "pending_manager_approval", "manager_approved"])
        .order("created_at", { ascending: false });

      if (incomingError) throw incomingError;
      setIncomingRequests(incoming || []);

      // Load outgoing requests (that I initiated)  
      const { data: outgoing, error: outgoingError } = await supabase
        .from("shift_swap_requests")
        .select(`
          id,
          status,
          requires_manager_approval,
          requester_notes,
          target_response,
          created_at,
          requester_assignment:shift_assignments!requester_assignment_id (
            id,
            staff_id,
            shift_id,
            shifts (
              shift_date,
              start_time,
              end_time,
              role,
              locations (name)
            ),
            employees:staff_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq("shift_assignments.staff_id", empData.id)
        .in("status", ["pending", "pending_manager_approval", "manager_approved"])
        .order("created_at", { ascending: false });

      if (outgoingError) throw outgoingError;
      setOutgoingRequests(outgoing || []);

    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load swap requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespondToRequest = (request: SwapRequest) => {
    setSelectedRequest(request);
    setResponseDialogOpen(true);
  };

  const respondToRequest = async (accept: boolean) => {
    if (!selectedRequest) return;

    try {
      // If accepting and manager has approved (or approval not needed), perform the swap
      if (accept && (selectedRequest.status === "manager_approved" || !selectedRequest.requires_manager_approval)) {
        // Get my current assignment for the same shift date
        const shiftDate = selectedRequest.requester_assignment.shifts.shift_date;
        
        const { data: myAssignments, error: myAssignError } = await supabase
          .from("shift_assignments")
          .select("*, shifts(*)")
          .eq("staff_id", employee.id)
          .eq("shifts.shift_date", shiftDate)
          .eq("approval_status", "approved");

        if (myAssignError) throw myAssignError;

        // Swap the assignments
        const { error: updateError1 } = await supabase
          .from("shift_assignments")
          .update({ staff_id: employee.id })
          .eq("id", selectedRequest.requester_assignment.id);

        if (updateError1) throw updateError1;

        if (myAssignments && myAssignments.length > 0) {
          const { error: updateError2 } = await supabase
            .from("shift_assignments")
            .update({ staff_id: selectedRequest.requester_assignment.staff_id })
            .eq("id", myAssignments[0].id);

          if (updateError2) throw updateError2;
        }

        // Update request status
        const { error: statusError } = await supabase
          .from("shift_swap_requests")
          .update({
            status: "completed",
            target_response: "accepted",
            target_responded_at: new Date().toISOString(),
            responded_at: new Date().toISOString()
          })
          .eq("id", selectedRequest.id);

        if (statusError) throw statusError;

        toast.success("Shift swap completed successfully!");
      } else if (accept) {
        // Just mark as accepted, waiting for manager approval
        const { error } = await supabase
          .from("shift_swap_requests")
          .update({
            target_response: "accepted",
            target_responded_at: new Date().toISOString()
          })
          .eq("id", selectedRequest.id);

        if (error) throw error;
        toast.info("You've accepted the swap. Waiting for manager approval.");
      } else {
        // Decline the request
        const { error } = await supabase
          .from("shift_swap_requests")
          .update({
            status: "declined",
            target_response: "declined",
            target_responded_at: new Date().toISOString(),
            responded_at: new Date().toISOString()
          })
          .eq("id", selectedRequest.id);

        if (error) throw error;
        toast.success("Swap request declined.");
      }

      setResponseDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error responding to request:", error);
      toast.error("Failed to respond to request: " + error.message);
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("shift_swap_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Swap request cancelled");
      loadData();
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      toast.error("Failed to cancel request");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Swap Requests
          </h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Incoming Requests */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Incoming Requests</h2>
          {incomingRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No incoming swap requests</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        {request.requester_assignment.employees.avatar_url ? (
                          <img 
                            src={request.requester_assignment.employees.avatar_url} 
                            alt={request.requester_assignment.employees.full_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {request.requester_assignment.employees.full_name.split(" ").map(n => n[0]).join("")}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{request.requester_assignment.employees.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "MMM d, h:mm a")}
                        </div>
                      </div>
                    </div>
                    {request.requires_manager_approval && (
                      <Badge variant="outline" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Needs Manager
                      </Badge>
                    )}
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 mb-3">
                    <div className="font-medium">
                      {format(new Date(request.requester_assignment.shifts.shift_date), "EEEE, MMMM d")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {request.requester_assignment.shifts.start_time.slice(0, 5)} - {request.requester_assignment.shifts.end_time.slice(0, 5)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {request.requester_assignment.shifts.locations.name}
                    </div>
                    <Badge variant="secondary" className="mt-2">
                      {request.requester_assignment.shifts.role}
                    </Badge>
                  </div>

                  {request.requester_notes && (
                    <div className="text-sm text-muted-foreground mb-3 italic">
                      "{request.requester_notes}"
                    </div>
                  )}

                  {request.status === "pending_manager_approval" ? (
                    <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                      Waiting for manager approval
                    </div>
                  ) : request.status === "manager_approved" && request.target_response === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRespondToRequest(request)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRespondToRequest(request)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                    </div>
                  ) : request.status === "pending" && !request.requires_manager_approval ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedRequest(request);
                          respondToRequest(false);
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedRequest(request);
                          respondToRequest(true);
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Outgoing Requests */}
        <div>
          <h2 className="text-lg font-semibold mb-3">My Requests</h2>
          {outgoingRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No outgoing swap requests</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {outgoingRequests.map((request) => {
                const shiftDate = request.requester_assignment.shifts.shift_date;
                const today = format(new Date(), "yyyy-MM-dd");
                const isPast = shiftDate < today;
                
                return (
                  <Card key={request.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      {isPast ? (
                        <Badge variant="secondary" className="text-xs">Expired</Badge>
                      ) : (
                        <Badge variant={
                          request.status === "pending_manager_approval" ? "outline" :
                          request.status === "manager_approved" ? "default" : "secondary"
                        }>
                          {request.status === "pending_manager_approval" ? "Pending Manager" :
                           request.status === "manager_approved" ? "Approved - Waiting for colleague" :
                           "Pending"}
                        </Badge>
                      )}
                      {!isPast && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelRequest(request.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="font-medium">
                        {format(new Date(shiftDate), "EEEE, MMMM d")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.requester_assignment.shifts.start_time.slice(0, 5)} - {request.requester_assignment.shifts.end_time.slice(0, 5)}
                      </div>
                      <Badge variant="secondary" className="mt-2">
                        {request.requester_assignment.shifts.role}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Swap Request</DialogTitle>
            <DialogDescription>
              Do you want to accept or decline this shift swap?
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium">
                  {format(new Date(selectedRequest.requester_assignment.shifts.shift_date), "EEEE, MMMM d")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedRequest.requester_assignment.shifts.start_time.slice(0, 5)} - {selectedRequest.requester_assignment.shifts.end_time.slice(0, 5)}
                </div>
                <Badge variant="secondary" className="mt-2">
                  {selectedRequest.requester_assignment.shifts.role}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => respondToRequest(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => respondToRequest(true)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StaffBottomNav />
    </div>
  );
};

export default StaffSwapRequests;
