import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, Clock, MapPin, Calendar, ArrowLeftRight, Check, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

const StaffShifts = () => {
  const [activeTab, setActiveTab] = useState("open-shifts");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-3">Shifts & Swaps</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="open-shifts" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Open Shifts
              </TabsTrigger>
              <TabsTrigger value="swap-requests" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Swaps
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="open-shifts" className="mt-0">
          <OpenShiftsContent />
        </TabsContent>
        <TabsContent value="swap-requests" className="mt-0">
          <SwapRequestsContent />
        </TabsContent>
      </Tabs>

      <StaffBottomNav />
    </div>
  );
};

// Open Shifts Content
const OpenShiftsContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("employees")
        .select("id, company_id, location_id")
        .eq("user_id", user.id)
        .maybeSingle();
      setEmployee(data);
    };
    fetchEmployee();
  }, [user]);

  const { data: openShifts = [], isLoading } = useQuery({
    queryKey: ["open-shifts", employee?.company_id],
    queryFn: async () => {
      if (!employee?.company_id) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("shifts")
        .select(`*, locations(name)`)
        .eq("company_id", employee.company_id)
        .eq("status", "offered")
        .gte("shift_date", today)
        .order("shift_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!employee?.company_id,
  });

  const claimShift = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error: assignError } = await supabase.from("shift_assignments").insert({
        shift_id: shiftId,
        staff_id: employee.id,
        approval_status: "approved",
        assigned_by: employee.id,
      } as any);
      if (assignError) throw assignError;
      const { error: updateError } = await supabase
        .from("shifts")
        .update({ status: "published" })
        .eq("id", shiftId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["staff-shifts"] });
      toast.success("Shift claimed! The shift has been added to your schedule.");
    },
    onError: () => {
      toast.error("Could not claim shift.");
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (openShifts.length === 0) {
    return (
      <div className="p-4">
        <Card className="p-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No open shifts available</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {openShifts.map((shift: any) => (
        <Card key={shift.id} className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">{format(new Date(shift.shift_date), "EEE, MMM d")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}</span>
              </div>
            </div>
            <Badge variant="secondary">Open</Badge>
          </div>
          {shift.locations?.name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MapPin className="h-3 w-3" />
              <span>{shift.locations.name}</span>
            </div>
          )}
          <Button
            size="sm"
            className="w-full"
            onClick={() => claimShift.mutate(shift.id)}
            disabled={claimShift.isPending}
          >
            Claim This Shift
          </Button>
        </Card>
      ))}
    </div>
  );
};

// Swap Requests Content
const SwapRequestsContent = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (empError) throw empError;
      setEmployee(empData);

      // Load incoming requests
      const { data: incoming } = await supabase
        .from("shift_swap_requests")
        .select(`
          id, status, requires_manager_approval, requester_notes, target_response, created_at,
          requester_assignment:shift_assignments!requester_assignment_id (
            id, staff_id, shift_id,
            shifts (shift_date, start_time, end_time, role, locations (name)),
            employees:staff_id (full_name, avatar_url)
          )
        `)
        .eq("target_staff_id", empData.id)
        .in("status", ["pending", "pending_manager_approval", "manager_approved"])
        .order("created_at", { ascending: false });

      setIncomingRequests(incoming || []);

      // Load outgoing requests
      const { data: outgoing } = await supabase
        .from("shift_swap_requests")
        .select(`
          id, status, requires_manager_approval, requester_notes, target_response, created_at,
          requester_assignment:shift_assignments!requester_assignment_id (
            id, staff_id, shift_id,
            shifts (shift_date, start_time, end_time, role, locations (name)),
            employees:staff_id (full_name, avatar_url)
          )
        `)
        .eq("shift_assignments.staff_id", empData.id)
        .in("status", ["pending", "pending_manager_approval", "manager_approved"])
        .order("created_at", { ascending: false });

      setOutgoingRequests(outgoing || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load swap requests");
    } finally {
      setIsLoading(false);
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean, request: any) => {
    try {
      if (accept && (request.status === "manager_approved" || !request.requires_manager_approval)) {
        const shiftDate = request.requester_assignment?.shifts?.shift_date;
        
        const { data: myAssignments } = await supabase
          .from("shift_assignments")
          .select("*, shifts(*)")
          .eq("staff_id", employee.id)
          .eq("shifts.shift_date", shiftDate)
          .eq("approval_status", "approved");

        await supabase
          .from("shift_assignments")
          .update({ staff_id: employee.id })
          .eq("id", request.requester_assignment.id);

        if (myAssignments && myAssignments.length > 0) {
          await supabase
            .from("shift_assignments")
            .update({ staff_id: request.requester_assignment.staff_id })
            .eq("id", myAssignments[0].id);
        }

        await supabase
          .from("shift_swap_requests")
          .update({
            status: "completed",
            target_response: "accepted",
            target_responded_at: new Date().toISOString(),
            responded_at: new Date().toISOString()
          })
          .eq("id", requestId);

        toast.success("Shift swap completed successfully!");
      } else if (accept) {
        await supabase
          .from("shift_swap_requests")
          .update({
            target_response: "accepted",
            target_responded_at: new Date().toISOString()
          })
          .eq("id", requestId);
        toast.info("You've accepted the swap. Waiting for manager approval.");
      } else {
        await supabase
          .from("shift_swap_requests")
          .update({
            status: "declined",
            target_response: "declined",
            target_responded_at: new Date().toISOString(),
            responded_at: new Date().toISOString()
          })
          .eq("id", requestId);
        toast.success("Swap request declined.");
      }
      loadData();
    } catch (error: any) {
      toast.error("Failed to respond to request: " + error.message);
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await supabase.from("shift_swap_requests").update({ status: "cancelled" }).eq("id", requestId);
      toast.success("Swap request cancelled");
      loadData();
    } catch (error) {
      toast.error("Failed to cancel request");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Incoming Requests */}
      <div>
        <h2 className="font-semibold mb-3">Incoming Requests</h2>
        {incomingRequests.length === 0 ? (
          <Card className="p-6 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No incoming swap requests</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {incomingRequests.map((req) => (
              <Card key={req.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{req.requester_assignment?.employees?.full_name}</p>
                    {req.requester_assignment?.shifts && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(req.requester_assignment.shifts.shift_date), "MMM d")} • {req.requester_assignment.shifts.start_time?.slice(0, 5)} - {req.requester_assignment.shifts.end_time?.slice(0, 5)}
                      </p>
                    )}
                  </div>
                  <Badge variant={req.status === "pending_manager_approval" ? "outline" : "secondary"}>
                    {req.status === "pending_manager_approval" ? "Pending Manager" : "Pending"}
                  </Badge>
                </div>
                {req.status === "pending" && !req.requires_manager_approval && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => respondToRequest(req.id, false, req)}>
                      <X className="h-4 w-4 mr-1" /> Decline
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => respondToRequest(req.id, true, req)}>
                      <Check className="h-4 w-4 mr-1" /> Accept
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Requests */}
      <div>
        <h2 className="font-semibold mb-3">My Requests</h2>
        {outgoingRequests.length === 0 ? (
          <Card className="p-6 text-center">
            <ArrowLeftRight className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No outgoing swap requests</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {outgoingRequests.map((req) => (
              <Card key={req.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    {req.requester_assignment?.shifts && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(req.requester_assignment.shifts.shift_date), "MMM d")} • {req.requester_assignment.shifts.start_time?.slice(0, 5)} - {req.requester_assignment.shifts.end_time?.slice(0, 5)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={req.status === "pending_manager_approval" ? "outline" : "secondary"}>
                      {req.status}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => cancelRequest(req.id)}>Cancel</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffShifts;
