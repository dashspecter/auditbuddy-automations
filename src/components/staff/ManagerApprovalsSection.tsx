import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, XCircle, Calendar, Clock, Users, ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";
import { usePendingApprovals, useApproveShiftAssignment, useRejectShiftAssignment } from "@/hooks/useShiftAssignments";
import { useTimeOffRequests, useUpdateTimeOffRequest } from "@/hooks/useTimeOffRequests";
import { usePendingSwapRequests, useApproveSwapRequest, useRejectSwapRequest } from "@/hooks/useShiftSwapRequests";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ManagerApprovalsSection = () => {
  const { data: pendingShifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = usePendingApprovals();
  const { data: timeOffRequests = [], isLoading: timeOffLoading } = useTimeOffRequests();
  const { data: swapRequests = [], isLoading: swapsLoading } = usePendingSwapRequests();
  const approveShift = useApproveShiftAssignment();
  const rejectShift = useRejectShiftAssignment();
  const updateTimeOff = useUpdateTimeOffRequest();
  const approveSwap = useApproveSwapRequest();
  const rejectSwap = useRejectSwapRequest();
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const pendingTimeOff = timeOffRequests.filter(req => req.status === 'pending');

  const handleApproveShift = async (id: string) => {
    setProcessingId(id);
    try {
      await approveShift.mutateAsync(id);
    } catch (error) {
      // Error is already handled by the mutation
      // Conflicting shifts are automatically deleted, so refetch
    } finally {
      await refetchShifts();
      setProcessingId(null);
    }
  };

  const handleRejectShift = async (id: string) => {
    console.log("[ManagerApprovals] Reject button clicked for:", id);
    setProcessingId(id);
    try {
      console.log("[ManagerApprovals] Calling mutateAsync...");
      await rejectShift.mutateAsync(id);
      console.log("[ManagerApprovals] Mutation completed, refetching...");
      await refetchShifts();
      console.log("[ManagerApprovals] Refetch completed");
    } catch (error) {
      console.error("[ManagerApprovals] Error during rejection:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveTimeOff = async (id: string) => {
    setProcessingId(id);
    const { data: { user } } = await supabase.auth.getUser();
    await updateTimeOff.mutateAsync({ 
      id, 
      status: 'approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    });
    setProcessingId(null);
  };

  const handleRejectTimeOff = async (id: string) => {
    setProcessingId(id);
    const { data: { user } } = await supabase.auth.getUser();
    await updateTimeOff.mutateAsync({ 
      id, 
      status: 'rejected',
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    });
    setProcessingId(null);
  };

  const handleApproveSwap = async (id: string) => {
    setProcessingId(id);
    await approveSwap.mutateAsync(id);
    setProcessingId(null);
  };

  const handleRejectSwap = async (id: string) => {
    setProcessingId(id);
    await rejectSwap.mutateAsync(id);
    setProcessingId(null);
  };

  const totalPending = pendingShifts.length + pendingTimeOff.length + swapRequests.length;

  if (shiftsLoading || timeOffLoading || swapsLoading) {
    return (
      <Card className="p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
      </Card>
    );
  }

  if (totalPending === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 hover:bg-accent/5 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Manager Approvals</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{totalPending}</Badge>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">

            {/* Pending Shift Assignments */}
            {pendingShifts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Shift Assignments</h3>
          {pendingShifts.map((assignment) => (
            <Card key={assignment.id} className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium text-sm">{assignment.employees?.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {assignment.shifts?.shift_date && format(new Date(assignment.shifts.shift_date), "EEE, MMM d")} • 
                    {assignment.shifts?.start_time.slice(0, 5)} - {assignment.shifts?.end_time.slice(0, 5)}
                  </div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {assignment.shifts?.role}
                  </Badge>
                  {assignment.shifts?.locations?.name && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{assignment.shifts.locations.name}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleApproveShift(assignment.id)}
                  disabled={processingId === assignment.id}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleRejectShift(assignment.id)}
                  disabled={processingId === assignment.id}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </Card>
                ))}
              </div>
            )}

            {/* Pending Time Off Requests */}
            {pendingTimeOff.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Time Off Requests</h3>
          {pendingTimeOff.map((request) => {
            const days = Math.ceil(
              (new Date(request.end_date).getTime() - new Date(request.start_date).getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;
            
            return (
              <Card key={request.id} className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{request.employees?.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(request.start_date), "MMM d")} - {format(new Date(request.end_date), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{days} day{days > 1 ? 's' : ''}</span>
                    </div>
                    {request.reason && (
                      <p className="text-xs text-muted-foreground mt-2 italic">"{request.reason}"</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApproveTimeOff(request.id)}
                    disabled={processingId === request.id}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleRejectTimeOff(request.id)}
                    disabled={processingId === request.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </Card>
              );
            })}
              </div>
            )}

            {/* Pending Shift Swaps */}
            {swapRequests.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Shift Swap Requests</h3>
          {swapRequests.map((swap: any) => (
            <Card key={swap.id} className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Swap Requested</span>
              </div>
              
              {/* Requester Side */}
              <div className="mb-3 pb-3 border-b">
                <div className="text-xs text-muted-foreground mb-1">Requesting:</div>
                <div className="font-medium text-sm">{swap.requester?.employees?.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {swap.requester?.shifts?.shift_date && format(new Date(swap.requester.shifts.shift_date), "MMM d")} • 
                  {swap.requester?.shifts?.start_time?.slice(0, 5)} - {swap.requester?.shifts?.end_time?.slice(0, 5)}
                </div>
                <Badge variant="outline" className="mt-1 text-xs">
                  {swap.requester?.shifts?.role}
                </Badge>
              </div>

              {/* Target Side */}
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-1">To swap with:</div>
                <div className="font-medium text-sm">{swap.target?.employees?.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {swap.target?.shifts?.shift_date && format(new Date(swap.target.shifts.shift_date), "MMM d")} • 
                  {swap.target?.shifts?.start_time?.slice(0, 5)} - {swap.target?.shifts?.end_time?.slice(0, 5)}
                </div>
                <Badge variant="outline" className="mt-1 text-xs">
                  {swap.target?.shifts?.role}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleApproveSwap(swap.id)}
                  disabled={processingId === swap.id}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleRejectSwap(swap.id)}
                  disabled={processingId === swap.id}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
              </Card>
            ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
