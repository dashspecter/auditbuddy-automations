import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePendingApprovals, useApproveShiftAssignment, useRejectShiftAssignment } from "@/hooks/useShiftAssignments";
import { format } from "date-fns";
import { Clock, MapPin, CheckCircle, XCircle, Calendar, AlertTriangle, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useScheduleGovernanceEnabled,
  usePendingChangeRequests,
  useWorkforceExceptions,
  useApproveChangeRequest,
  useDenyChangeRequest,
  useResolveWorkforceException,
  SCHEDULE_CHANGE_REASON_CODES
} from "@/hooks/useScheduleGovernance";
import { Separator } from "@/components/ui/separator";

interface PendingApprovalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterPeriodId?: string;
  filterLocationId?: string;
}

export function PendingApprovalsDialog({ 
  open, 
  onOpenChange,
  filterPeriodId,
  filterLocationId 
}: PendingApprovalsDialogProps) {
  const [activeTab, setActiveTab] = useState("shift-assignments");
  
  // Original shift assignment approvals
  const { data: pendingApprovals, isLoading: approvalsLoading } = usePendingApprovals();
  const approveAssignment = useApproveShiftAssignment();
  const rejectAssignment = useRejectShiftAssignment();
  
  // Schedule governance approvals
  const isGovernanceEnabled = useScheduleGovernanceEnabled();
  const { data: changeRequests = [], isLoading: changeRequestsLoading } = usePendingChangeRequests(filterPeriodId);
  const { data: exceptions = [], isLoading: exceptionsLoading } = useWorkforceExceptions({ 
    status: 'pending',
    locationId: filterLocationId 
  });
  const approveChangeRequest = useApproveChangeRequest();
  const denyChangeRequest = useDenyChangeRequest();
  const resolveException = useResolveWorkforceException();

  const handleApprove = async (assignmentId: string) => {
    await approveAssignment.mutateAsync(assignmentId);
  };

  const handleReject = async (assignmentId: string) => {
    await rejectAssignment.mutateAsync(assignmentId);
  };

  const handleApproveChangeRequest = async (requestId: string) => {
    await approveChangeRequest.mutateAsync(requestId);
  };

  const handleDenyChangeRequest = async (requestId: string) => {
    await denyChangeRequest.mutateAsync(requestId);
  };

  const handleResolveException = async (exceptionId: string, status: 'approved' | 'denied' | 'resolved') => {
    await resolveException.mutateAsync({ exceptionId, status });
  };

  const getReasonLabel = (code: string) => {
    return SCHEDULE_CHANGE_REASON_CODES.find(r => r.value === code)?.label || code;
  };

  const getExceptionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'late_start': 'Late Start',
      'early_leave': 'Early Leave',
      'unscheduled_shift': 'Unscheduled Clock-in',
      'no_show': 'No Show',
      'shift_extended': 'Shift Extended',
      'overtime': 'Overtime'
    };
    return labels[type] || type;
  };

  const pendingCount = pendingApprovals?.length || 0;
  const changeRequestCount = changeRequests.length;
  const exceptionCount = exceptions.length;
  const totalCount = pendingCount + changeRequestCount + exceptionCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Pending Approvals
            {totalCount > 0 && (
              <Badge variant="destructive">{totalCount}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Review and approve pending requests
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shift-assignments" className="relative">
              <Users className="h-4 w-4 mr-1" />
              Shifts
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            {isGovernanceEnabled && (
              <>
                <TabsTrigger value="schedule-changes" className="relative">
                  <Calendar className="h-4 w-4 mr-1" />
                  Changes
                  {changeRequestCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{changeRequestCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="exceptions" className="relative">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Exceptions
                  {exceptionCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{exceptionCount}</Badge>
                  )}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Shift Assignments Tab */}
          <TabsContent value="shift-assignments" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {approvalsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !pendingApprovals || pendingApprovals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending shift approvals
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingApprovals.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{assignment.employees?.full_name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">Employee: {assignment.employees?.role}</Badge>
                            <span>→</span>
                            <Badge variant="outline">Shift: {assignment.shifts?.role}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {assignment.shifts?.shift_date && format(new Date(assignment.shifts.shift_date), "MMM d, yyyy")}
                          {" "}{assignment.shifts?.start_time} - {assignment.shifts?.end_time}
                        </div>
                        {assignment.shifts?.locations && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {assignment.shifts.locations.name}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="default" onClick={() => handleApprove(assignment.id)} disabled={approveAssignment.isPending} className="flex-1">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(assignment.id)} disabled={rejectAssignment.isPending} className="flex-1">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Schedule Changes Tab */}
          {isGovernanceEnabled && (
            <TabsContent value="schedule-changes" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {changeRequestsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : changeRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending schedule change requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {changeRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                request.change_type === 'add' ? 'default' : 
                                request.change_type === 'delete' ? 'destructive' : 'secondary'
                              }>
                                {request.change_type === 'add' ? 'Add' : 
                                 request.change_type === 'delete' ? 'Delete' : 'Edit'}
                              </Badge>
                              <span className="font-medium">
                                {request.payload_after?.role || request.payload_before?.role || 'Shift'}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {request.payload_after?.shift_date || request.payload_before?.shift_date}
                              {' '}
                              {(request.payload_after?.start_time || request.payload_before?.start_time)?.slice(0,5)}
                              -
                              {(request.payload_after?.end_time || request.payload_before?.end_time)?.slice(0,5)}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(request.requested_at), 'MMM d, h:mm a')}
                          </div>
                        </div>
                        
                        <div className="bg-muted/50 rounded-md p-2 text-sm">
                          <div className="font-medium text-xs text-muted-foreground mb-1">Reason</div>
                          <div>{getReasonLabel(request.reason_code || '')}</div>
                          {request.note && (
                            <div className="text-muted-foreground mt-1 text-xs">{request.note}</div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="default" onClick={() => handleApproveChangeRequest(request.id)} disabled={approveChangeRequest.isPending} className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDenyChangeRequest(request.id)} disabled={denyChangeRequest.isPending} className="flex-1">
                            <XCircle className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}

          {/* Exceptions Tab */}
          {isGovernanceEnabled && (
            <TabsContent value="exceptions" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {exceptionsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : exceptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending exceptions
                  </div>
                ) : (
                  <div className="space-y-4">
                    {exceptions.map((exception) => (
                      <div key={exception.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{getExceptionTypeLabel(exception.exception_type)}</Badge>
                              <span className="font-medium">{exception.employees?.full_name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {exception.locations?.name} • {exception.shift_date}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(exception.detected_at), 'MMM d, h:mm a')}
                          </div>
                        </div>

                        {exception.metadata && Object.keys(exception.metadata).length > 0 && (
                          <div className="bg-muted/50 rounded-md p-2 text-sm">
                            <div className="font-medium text-xs text-muted-foreground mb-1">Details</div>
                            {exception.metadata.late_minutes && (
                              <div>Late by {exception.metadata.late_minutes} minutes</div>
                            )}
                            {exception.metadata.early_minutes && (
                              <div>Left {exception.metadata.early_minutes} minutes early</div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="default" onClick={() => handleResolveException(exception.id, 'approved')} disabled={resolveException.isPending} className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleResolveException(exception.id, 'resolved')} disabled={resolveException.isPending} className="flex-1">
                            Resolve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleResolveException(exception.id, 'denied')} disabled={resolveException.isPending} className="flex-1">
                            <XCircle className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}