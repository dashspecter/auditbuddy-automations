import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Pencil, 
  Trash2,
  User
} from "lucide-react";
import { format } from "date-fns";
import {
  ScheduleChangeRequest,
  SCHEDULE_CHANGE_REASON_CODES,
  usePendingChangeRequests,
  useApproveChangeRequest,
  useDenyChangeRequest
} from "@/hooks/useScheduleGovernance";

interface ChangeRequestsPanelProps {
  periodId?: string;
  showAll?: boolean;
}

export const ChangeRequestsPanel = ({ periodId, showAll }: ChangeRequestsPanelProps) => {
  const { data: requests = [], isLoading } = usePendingChangeRequests(showAll ? undefined : periodId);
  const approveMutation = useApproveChangeRequest();
  const denyMutation = useDenyChangeRequest();

  const getChangeTypeIcon = (type: ScheduleChangeRequest['change_type']) => {
    switch (type) {
      case 'add': return Plus;
      case 'edit': return Pencil;
      case 'delete': return Trash2;
    }
  };

  const getChangeTypeLabel = (type: ScheduleChangeRequest['change_type']) => {
    switch (type) {
      case 'add': return 'Add Shift';
      case 'edit': return 'Edit Shift';
      case 'delete': return 'Remove Shift';
    }
  };

  const getReasonLabel = (code: string) => {
    return SCHEDULE_CHANGE_REASON_CODES.find(r => r.value === code)?.label || code;
  };

  const formatShiftDetails = (payload: Record<string, any>) => {
    if (!payload || Object.keys(payload).length === 0) return null;
    
    const parts: string[] = [];
    if (payload.role) parts.push(payload.role);
    if (payload.shift_date) parts.push(format(new Date(payload.shift_date), 'MMM d'));
    if (payload.start_time && payload.end_time) {
      parts.push(`${payload.start_time.slice(0, 5)} - ${payload.end_time.slice(0, 5)}`);
    }
    return parts.join(' • ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Change Requests
          </CardTitle>
          <CardDescription>Schedule modification requests pending approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No pending change requests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Change Requests
          <Badge variant="secondary">{requests.length}</Badge>
        </CardTitle>
        <CardDescription>Schedule modification requests pending approval</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {requests.map((request) => {
              const ChangeIcon = getChangeTypeIcon(request.change_type);
              const isPending = approveMutation.isPending || denyMutation.isPending;
              
              return (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <ChangeIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{getChangeTypeLabel(request.change_type)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatShiftDetails(request.payload_after) || 'Shift details'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>

                  {/* Reason */}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Reason: </span>
                    <span className="font-medium">{getReasonLabel(request.reason_code || '')}</span>
                  </div>

                  {/* Note if present */}
                  {request.note && (
                    <div className="text-sm bg-muted rounded p-2">
                      <span className="text-muted-foreground">Note: </span>
                      {request.note}
                    </div>
                  )}

                  {/* Requested by and time */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Requested {format(new Date(request.requested_at), 'MMM d, h:mm a')}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => approveMutation.mutate(request.id)}
                      disabled={isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => denyMutation.mutate(request.id)}
                      disabled={isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
